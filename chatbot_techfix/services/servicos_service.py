from decimal import Decimal
from database.conexao import conectar_banco


def _serializar_servico(row: dict) -> dict:
    """Converte tipos do MySQL (como Decimal) para JSON serializável."""
    preco = row["preco"]
    if isinstance(preco, Decimal):
        preco = float(preco)
    return {
        "id": row["id"],
        "nome": row["nome"],
        "preco": float(preco),
    }


def listar_servicos() -> list[dict]:
    """Retorna todos os serviços cadastrados ordenados por ID."""
    conexao = conectar_banco()
    cursor = None
    try:
        cursor = conexao.cursor(dictionary=True)
        cursor.execute("SELECT id, nome, preco FROM servicos ORDER BY id ASC")
        rows = cursor.fetchall()
        return [_serializar_servico(row) for row in rows]
    finally:
        if cursor is not None:
            cursor.close()
        conexao.close()


def buscar_servico_por_id(servico_id: int) -> dict | None:
    """Busca um serviço específico pelo ID usando consulta parametrizada."""
    conexao = conectar_banco()
    cursor = None
    try:
        cursor = conexao.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nome, preco FROM servicos WHERE id = %s",
            (servico_id,),
        )
        row = cursor.fetchone()
        return _serializar_servico(row) if row else None
    finally:
        if cursor is not None:
            cursor.close()
        conexao.close()


def criar_servico(nome: str, preco: float) -> dict:
    """Insere um novo serviço no banco e retorna o registro criado."""
    conexao = conectar_banco()
    cursor = None
    try:
        cursor = conexao.cursor()
        cursor.execute(
            "INSERT INTO servicos (nome, preco) VALUES (%s, %s)",
            (nome, preco),
        )
        conexao.commit()
        novo_id = cursor.lastrowid
        return {
            "id": novo_id,
            "nome": nome,
            "preco": float(preco),
        }
    except Exception:
        conexao.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        conexao.close()


def atualizar_servico(servico_id: int, nome: str, preco: float) -> dict | None:
    """Atualiza um serviço existente. Retorna None se o ID não existir."""
    conexao = conectar_banco()
    cursor = None
    try:
        cursor = conexao.cursor(dictionary=True)
        cursor.execute("SELECT id FROM servicos WHERE id = %s", (servico_id,))
        existente = cursor.fetchone()
        if not existente:
            return None

        cursor.execute(
            "UPDATE servicos SET nome = %s, preco = %s WHERE id = %s",
            (nome, preco, servico_id),
        )
        conexao.commit()
        return {
            "id": servico_id,
            "nome": nome,
            "preco": float(preco),
        }
    except Exception:
        conexao.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        conexao.close()


def excluir_servico(servico_id: int) -> bool:
    """Exclui um serviço pelo ID e verifica cursor.rowcount."""
    conexao = conectar_banco()
    cursor = None
    try:
        cursor = conexao.cursor()
        cursor.execute("DELETE FROM servicos WHERE id = %s", (servico_id,))
        if cursor.rowcount == 0:
            conexao.rollback()
            return False
        conexao.commit()
        return True
    except Exception:
        conexao.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        conexao.close()
