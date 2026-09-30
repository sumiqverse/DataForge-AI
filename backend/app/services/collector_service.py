import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from app.services.ai_service import extract_and_map_fields

class BaseCollector:
    async def collect(self, url_or_api: str, query: str, fields: List[str]) -> List[Dict[str, Any]]:
        raise NotImplementedError

class HTTPCollector(BaseCollector):
    async def collect(self, url_or_api: str, query: str, fields: List[str]) -> List[Dict[str, Any]]:
        print(f"Collecting from {url_or_api} via HTTPX...")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url_or_api, timeout=10.0)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Strip unnecessary tags
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.extract()
                
                raw_text = soup.get_text(separator=' ', strip=True)
                
                # LLM Field Mapping -> Structured record
                mapped_record = extract_and_map_fields(raw_text, fields)
                return [mapped_record]
        except Exception as e:
            # Fallback if URL is invalid or blocked
            return [{"error": f"Failed to collect from {url_or_api}: {str(e)}", **{f: "N/A" for f in fields}}]

class BrowserCollector(BaseCollector):
    async def collect(self, url_or_api: str, query: str, fields: List[str]) -> List[Dict[str, Any]]:
        print(f"Collecting from {url_or_api} via BrowserCollector (Playwright Mock)...")
        return [
            {field: f"[JS Rendered] Mock data for {field}" for field in fields}
        ]

class APICollector(BaseCollector):
    async def collect(self, url_or_api: str, query: str, fields: List[str]) -> List[Dict[str, Any]]:
        print(f"Collecting from {url_or_api} via APICollector...")
        return [
            {field: f"[API] Mock JSON data for {field}" for field in fields}
        ]

class CollectionEngine:
    @staticmethod
    def get_collector(extraction_method: str) -> BaseCollector:
        if extraction_method == "standard_web":
            return HTTPCollector()
        elif extraction_method == "js_rendered":
            return BrowserCollector()
        elif extraction_method in ["rest_api", "graphql"]:
            return APICollector()
        else:
            return HTTPCollector()
