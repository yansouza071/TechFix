from flask import Blueprint, jsonify, request
from services import chatbot_service

chatbot_bp = Blueprint("chatbot", __name__)


@chatbot_bp.route("/chat", methods=["POST"])
def conversar():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Corpo da requisição deve ser um JSON válido."}), 400

    mensagem = dados.get("mensagem")
    if not isinstance(mensagem, str) or not mensagem.strip():
        return jsonify({"erro": "O campo 'mensagem' é obrigatório e não pode estar vazio."}), 400

    resposta = chatbot_service.responder(mensagem.strip())
    return jsonify({"resposta": resposta}), 200
