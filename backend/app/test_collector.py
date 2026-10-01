import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.collector_service import CollectionEngine, HTTPCollector, APICollector, BrowserCollector

def test_http_collector():
    async def run_test():
        collector = CollectionEngine.get_collector("http", 1, {"url": "http://127.0.0.1:8000/api/demo/source"})
        assert isinstance(collector, HTTPCollector)
        
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = "<html><body>Demo Content</body></html>"
            mock_response.headers = {"Content-Type": "text/html"}
            mock_get.return_value = mock_response
            
            docs = await collector.collect()
            
            assert len(docs) == 1
            assert docs[0].source_id == 1
            assert docs[0].url == "http://127.0.0.1:8000/api/demo/source"
            assert docs[0].raw_content == "<html><body>Demo Content</body></html>"
            assert docs[0].metadata["status_code"] == 200

    asyncio.run(run_test())


def test_api_collector_pagination():
    async def run_test():
        collector = CollectionEngine.get_collector("api", 2, {
            "endpoint": "http://127.0.0.1:8000/api/demo/source",
            "pagination_param": "page",
            "max_pages": 2
        })
        assert isinstance(collector, APICollector)
        
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            def side_effect(url, headers, params):
                mock_response = MagicMock()
                mock_response.status_code = 200
                page = params.get("page", 1)
                mock_response.text = f'{{"data": "page {page}"}}'
                mock_response.url = f"{url}?page={page}"
                return mock_response
                
            mock_get.side_effect = side_effect
            
            docs = await collector.collect()
            
            assert len(docs) == 2
            assert docs[0].source_id == 2
            assert docs[0].metadata["page"] == 1
            assert "page 1" in docs[0].raw_content
            
            assert docs[1].source_id == 2
            assert docs[1].metadata["page"] == 2
            assert "page 2" in docs[1].raw_content

    asyncio.run(run_test())


def test_http_collector_retry_failure():
    async def run_test():
        collector = CollectionEngine.get_collector("http", 1, {
            "url": "http://127.0.0.1:8000/api/demo/source",
            "retries": 2,
            "timeout": 1.0,
            "delay_ms": 0
        })
        
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            import httpx
            mock_get.side_effect = httpx.HTTPStatusError("Error", request=MagicMock(), response=MagicMock())
            
            with patch("asyncio.sleep", new_callable=AsyncMock):
                with pytest.raises(RuntimeError) as exc:
                    await collector.collect()
                    
                assert "HTTPCollector failed after 2 attempts" in str(exc.value)

    asyncio.run(run_test())
