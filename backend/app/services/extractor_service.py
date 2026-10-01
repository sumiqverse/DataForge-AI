import json
import re
from typing import List, Dict, Any
from bs4 import BeautifulSoup
from app.schemas.collection import RawDocument
from app.schemas.extraction import ExtractedRecord
from app.services.ai_service import extract_and_map_fields

class ExtractorPipeline:
    def __init__(self, dataset_schema: List[Dict[str, Any]], config: Dict[str, Any] = None):
        self.dataset_schema = dataset_schema
        self.schema_fields = [f.get("name") for f in dataset_schema if "name" in f]
        self.config = config or {}

    def _extract_deterministic_html(self, soup: BeautifulSoup, selectors: Dict[str, str]) -> Dict[str, Any]:
        extracted = {}
        for field, selector in selectors.items():
            if field not in self.schema_fields:
                continue
            
            # Very basic selector parsing for attrs vs text
            attr = None
            if "::attr(" in selector:
                parts = selector.split("::attr(")
                selector = parts[0]
                attr = parts[1].replace(")", "")
                
            elements = soup.select(selector)
            if elements:
                el = elements[0]
                if attr:
                    extracted[field] = el.get(attr)
                else:
                    extracted[field] = el.get_text(strip=True)
            else:
                extracted[field] = None
        return extracted

    def _extract_deterministic_json(self, data: Any, paths: Dict[str, str]) -> Dict[str, Any]:
        extracted = {}
        for field, path in paths.items():
            if field not in self.schema_fields:
                continue
            # Simple dict traversal for JSON mapping
            keys = path.split(".")
            current = data
            try:
                for k in keys:
                    current = current[k]
                extracted[field] = current
            except (KeyError, TypeError):
                extracted[field] = None
        return extracted
        
    def _extract_regex(self, raw_content: str, patterns: Dict[str, str]) -> Dict[str, Any]:
        extracted = {}
        for field, pattern in patterns.items():
            if field not in self.schema_fields:
                continue
            match = re.search(pattern, raw_content)
            if match:
                # Use first capture group if it exists, otherwise the whole match
                extracted[field] = match.group(1) if match.groups() else match.group(0)
            else:
                extracted[field] = None
        return extracted

    def extract(self, doc: RawDocument) -> ExtractedRecord:
        values = {field: None for field in self.schema_fields}
        metadata = {"methods_used": []}
        confidence = 1.0
        
        content = doc.raw_content
        
        # 1. Deterministic Extraction
        if self.config:
            if "selectors" in self.config and content:
                soup = BeautifulSoup(content, 'html.parser')
                html_vals = self._extract_deterministic_html(soup, self.config["selectors"])
                values.update({k: v for k, v in html_vals.items() if v is not None})
                if html_vals:
                    metadata["methods_used"].append("css_selectors")
                    
            if "json_paths" in self.config and content:
                try:
                    json_data = json.loads(content)
                    json_vals = self._extract_deterministic_json(json_data, self.config["json_paths"])
                    values.update({k: v for k, v in json_vals.items() if v is not None})
                    if json_vals:
                        metadata["methods_used"].append("json_paths")
                except json.JSONDecodeError:
                    pass
                    
            if "regex" in self.config and content:
                regex_vals = self._extract_regex(content, self.config["regex"])
                values.update({k: v for k, v in regex_vals.items() if v is not None})
                if regex_vals:
                    metadata["methods_used"].append("regex")
                    
        # 2. Identify missing values
        missing_fields = [f for f, v in values.items() if v is None]
        
        # 3. LLM Fallback for ambiguous semantic fields
        if missing_fields:
            use_llm = self.config.get("use_llm_fallback", True)
            if use_llm:
                try:
                    # Strip raw content to avoid token limits for LLM
                    soup = BeautifulSoup(content, 'html.parser')
                    for tag in soup(["script", "style", "nav", "footer", "header"]):
                        tag.extract()
                    clean_text = soup.get_text(separator=' ', strip=True)[:15000] # Limit to 15K chars
                    
                    llm_vals = extract_and_map_fields(clean_text, missing_fields)
                    
                    for f in missing_fields:
                        if f in llm_vals and llm_vals[f] not in [None, "N/A", ""]:
                            values[f] = llm_vals[f]
                            
                    metadata["methods_used"].append("llm_fallback")
                    # Reduce confidence slightly since LLM is probabilistic
                    confidence = 0.85
                except Exception as e:
                    metadata["llm_error"] = str(e)

        # 4. Final Validation: Never create undeclared fields
        final_values = {f: values.get(f) for f in self.schema_fields}

        return ExtractedRecord(
            values=final_values,
            source_url=doc.url,
            extraction_metadata=metadata,
            confidence=confidence
        )
