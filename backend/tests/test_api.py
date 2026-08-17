from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_upas_are_ordered_and_have_fresh_timestamp() -> None:
    response = client.get("/api/upas")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["name"] == "UPA Centro"
    assert all(item["lastUpdated"] for item in data)


def test_best_upa_uses_lowest_wait_estimate() -> None:
    response = client.get("/api/upas/best")

    assert response.status_code == 200
    assert response.json()["waitMinutes"] == 18


def test_chat_lists_all_units() -> None:
    response = client.post("/api/chat", json={"message": "Mostre todas as unidades"})

    assert response.status_code == 200
    assert "UPA Centro" in response.json()["reply"]
    assert "UPA Zona Sul" in response.json()["reply"]


def test_chat_handles_emergency_language_without_queue_recommendation() -> None:
    response = client.post("/api/chat", json={"message": "É uma emergência grave"})

    assert response.status_code == 200
    assert "não escolha" in response.json()["reply"]


def test_chat_rejects_empty_input() -> None:
    response = client.post("/api/chat", json={"message": ""})

    assert response.status_code == 422

