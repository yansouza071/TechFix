from flask import Blueprint, jsonify, request
from services import servicos_service

servicos_bp = Blueprint("servicos", __name__)


def _validar_payload_servico(dados: dict | None) -> tuple[str | None, float | None, str | None]:
    """Valida nome (string não vazia até 100 chars) e preco (número > 0)."""
    if not isinstance(dados, dict):
        return None, None, "Corpo da requisição deve ser um JSON válido."

    nome = dados.get("nome")
    preco = dados.get("preco")

    if not isinstance(nome, str) or not nome.strip():
        return None, None, "O campo 'nome' é obrigatório e deve ser uma string não vazia."

    nome_limpo = nome.strip()
    if len(nome_limpo) > 100:
        return None, None, "O campo 'nome' deve ter no máximo 100 caracteres."

    if isinstance(preco, bool) or not isinstance(preco, (int, float)):
        return None, None, "O campo 'preco' é obrigatório e deve ser um número."

    if preco <= 0:
        return None, None, "O campo 'preco' deve ser maior que zero."

    return nome_limpo, float(preco), None


@servicos_bp.route("/servicos", methods=["GET"])
def listar():
    servicos = servicos_service.listar_servicos()
    return jsonify(servicos), 200


@servicos_bp.route("/servicos/<int:id>", methods=["GET"])
def buscar_por_id(id: int):
    servico = servicos_service.buscar_servico_por_id(id)
    if not servico:
        return jsonify({"erro": "Serviço não encontrado."}), 404
    return jsonify(servico), 200


@servicos_bp.route("/servicos", methods=["POST"])
def criar():
    dados = request.get_json(silent=True)
    nome, preco, erro = _validar_payload_servico(dados)
    if erro:
        return jsonify({"erro": erro}), 400

    novo_servico = servicos_service.criar_servico(nome, preco)
    return jsonify(novo_servico), 201


@servicos_bp.route("/servicos/<int:id>", methods=["PUT"])
def atualizar(id: int):
    dados = request.get_json(silent=True)
    nome, preco, erro = _validar_payload_servico(dados)
    if erro:
        return jsonify({"erro": erro}), 400

    servico_atualizado = servicos_service.atualizar_servico(id, nome, preco)
    if not servico_atualizado:
        return jsonify({"erro": "Serviço não encontrado."}), 404
    return jsonify(servico_atualizado), 200


@servicos_bp.route("/servicos/<int:id>", methods=["DELETE"])
def excluir(id: int):
    removido = servicos_service.excluir_servico(id)
    if not removido:
        return jsonify({"erro": "Serviço não encontrado."}), 404
    return jsonify({"mensagem": "Serviço excluído com sucesso."}), 200
