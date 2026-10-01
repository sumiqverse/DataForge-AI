import uuid
import re
from itertools import combinations
from typing import List, Dict, Any
from app.schemas.extraction import ExtractedRecord
from app.schemas.deduplication import DuplicateCluster

class DeduplicationEngine:
    @staticmethod
    def _normalize_string(s: Any) -> str:
        if s is None:
            return ""
        s = str(s)
        # Remove punctuation, lower case, extra spaces
        s = re.sub(r'[^\w\s]', '', s.lower())
        return re.sub(r'\s+', ' ', s).strip()

    @staticmethod
    def _jaccard_similarity(s1: str, s2: str) -> float:
        set1 = set(s1.split())
        set2 = set(s2.split())
        if not set1 or not set2:
            return 0.0
        union_len = len(set1.union(set2))
        if union_len == 0:
            return 0.0
        return len(set1.intersection(set2)) / union_len

    @staticmethod
    def cluster_records(records: List[ExtractedRecord], identifying_fields: List[str], config: Dict[str, Any] = None) -> List[DuplicateCluster]:
        if not records:
            return []
            
        config = config or {}
        similarity_threshold = config.get("similarity_threshold", 0.7)
        use_llm = config.get("use_llm_verification", False)
        
        n = len(records)
        edges = [] # pairs of (i, j, reason)
        
        for i, j in combinations(range(n), 2):
            r1 = records[i]
            r2 = records[j]
            
            # Stage 1: Exact matching
            exact_match = True
            has_data = False
            for field in identifying_fields:
                v1 = r1.values.get(field)
                v2 = r2.values.get(field)
                if v1 is not None or v2 is not None:
                    has_data = True
                if v1 != v2 or v1 is None or v2 is None:
                    exact_match = False
                    break
            
            if exact_match and has_data:
                edges.append((i, j, "exact_match"))
                continue
                
            # Stage 2: Normalized string comparison
            norm_match = True
            has_data = False
            for field in identifying_fields:
                v1 = r1.values.get(field)
                v2 = r2.values.get(field)
                
                s1 = DeduplicationEngine._normalize_string(v1)
                s2 = DeduplicationEngine._normalize_string(v2)
                
                if s1 or s2:
                    has_data = True
                    
                if not s1 or not s2 or s1 != s2:
                    norm_match = False
                    break
                    
            if norm_match and has_data:
                edges.append((i, j, "normalized_match"))
                continue
                
            # Stage 3: Similarity matching
            total_sim = 0.0
            valid_fields = 0
            for field in identifying_fields:
                v1 = r1.values.get(field)
                v2 = r2.values.get(field)
                if v1 and v2:
                    s1 = DeduplicationEngine._normalize_string(v1)
                    s2 = DeduplicationEngine._normalize_string(v2)
                    sim = DeduplicationEngine._jaccard_similarity(s1, s2)
                    total_sim += sim
                    valid_fields += 1
            
            avg_sim = (total_sim / valid_fields) if valid_fields > 0 else 0.0
            
            if avg_sim >= similarity_threshold:
                edges.append((i, j, "similarity_match"))
        
        # Build Connected Components (Duplicate Clusters)
        visited = set()
        adj = {i: [] for i in range(n)}
        reasons = {}
        
        for u, v, reason in edges:
            adj[u].append(v)
            adj[v].append(u)
            reasons[tuple(sorted([u, v]))] = reason
            
        components = []
        comp_reason_lists = []
        
        def dfs(node, component, comp_reasons):
            visited.add(node)
            component.append(node)
            for neighbor in adj[node]:
                if neighbor not in visited:
                    comp_reasons.append(reasons[tuple(sorted([node, neighbor]))])
                    dfs(neighbor, component, comp_reasons)
                    
        for i in range(n):
            if i not in visited:
                comp = []
                comp_r = []
                dfs(i, comp, comp_r)
                components.append(comp)
                comp_reason_lists.append(comp_r)
                
        # Create DuplicateClusters
        results = []
        for c_idx, component in enumerate(components):
            comp_reasons = comp_reason_lists[c_idx]
            member_recs = [records[i] for i in component]
            
            # Choose canonical record (first one for now, or most complete)
            # In a real scenario, we'd pick the one with fewest None values
            member_recs.sort(key=lambda r: sum(1 for v in r.values.values() if v is not None), reverse=True)
            canonical = member_recs[0].values.copy()
            source_refs = [r.source_url for r in member_recs]
            
            # Find conflicting values
            conflicting_values = {}
            for field in canonical.keys():
                vals = set()
                for r in member_recs:
                    v = r.values.get(field)
                    if v is not None:
                        vals.add(str(v).strip())
                if len(vals) > 1:
                    conflicting_values[field] = list(vals)
                    
            cluster = DuplicateCluster(
                cluster_id=str(uuid.uuid4()),
                canonical_record=canonical,
                source_references=list(set(source_refs)),
                conflicting_values=conflicting_values,
                member_records=[r.dict() for r in member_recs],
                merge_reasons=list(set(comp_reasons))
            )
            results.append(cluster)
            
        return results
