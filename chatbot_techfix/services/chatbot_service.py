import string
from nltk.tokenize import wordpunct_tokenize
import spacy
from spacy.matcher import PhraseMatcher

from services import servicos_service

STOPWORDS_BASICAS = {"a", "o", "de", "do", "da", "para", "?", "!"}
PONTUACAO = set(string.punctuation)

# Inicialização do modelo em branco do português e PhraseMatcher (attr="LOWER")
nlp = spacy.blank("pt")
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

SERVICOS_PADRAO = [
    "Troca de Tela",
    "Formatação de Notebook",
    "Substituição de Bateria",
]

matcher.add("SERVICO_TECHFIX", [nlp.make_doc(nome) for nome in SERVICOS_PADRAO])


def _atualizar_matcher_com_banco(servicos: list[dict]) -> None:
    """Garante que novos serviços cadastrados no MySQL também sejam reconhecidos."""
    padroes = [nlp.make_doc(s["nome"]) for s in servicos if s.get("nome")]
    if padroes:
        matcher.add("SERVICO_DINAMICO", padroes)


def limpar_texto(mensagem: str) -> list[str]:
    """Converte para minúsculas, aplica wordpunct_tokenize e remove pontuação/artigos."""
    texto_minusculo = mensagem.lower()
    tokens = wordpunct_tokenize(texto_minusculo)
    tokens_limpos = [
        token
        for token in tokens
        if token not in STOPWORDS_BASICAS
        and token not in PONTUACAO
        and not all(ch in string.punctuation for ch in token)
    ]
    return tokens_limpos


def _identificar_servicos_na_frase(mensagem: str, servicos_banco: list[dict]) -> list[str]:
    """Aplica o PhraseMatcher do spaCy para identificar nomes de serviços na frase."""
    _atualizar_matcher_com_banco(servicos_banco)
    doc = nlp(mensagem)
    matches = matcher(doc)
    encontrados: list[str] = []
    for _, start, end in matches:
        trecho = doc[start:end].text
        if trecho.lower() not in [item.lower() for item in encontrados]:
            encontrados.append(trecho)
    return encontrados


def responder(mensagem: str) -> str:
    """Classifica a intenção da mensagem usando tokens NLTK e entidades spaCy."""
    tokens = limpar_texto(mensagem)
    tokens_set = set(tokens)

    # 1. Saudação
    if tokens_set & {"oi", "olá", "ola"}:
        return (
            "Olá! Bem-vindo à TechFix Assistência Técnica. "
            "Posso ajudar você a consultar nossos serviços, preços, horários ou endereço."
        )

    # 2. Horário / Localização
    if tokens_set & {"horário", "horario", "endereço", "endereco", "loja"}:
        return (
            "A TechFix funciona de segunda a sexta, das 08h às 18h, "
            "na Av. Principal, 1000."
        )

    # 3. Consulta de Catálogo / Preços
    palavras_catalogo = {
        "serviço",
        "servico",
        "servicos",
        "serviços",
        "preço",
        "preco",
        "preços",
        "precos",
        "valor",
        "valores",
        "quanto",
        "custa",
    }
    if tokens_set & palavras_catalogo:
        servicos = servicos_service.listar_servicos()
        if not servicos:
            return "No momento não há serviços cadastrados no catálogo da TechFix."

        servicos_citados = _identificar_servicos_na_frase(mensagem, servicos)

        # Regra com spaCy: serviço específico citado na frase
        if servicos_citados:
            citados_lower = {s.lower() for s in servicos_citados}
            filtrados = [
                s for s in servicos if s["nome"].lower() in citados_lower
            ]
            if filtrados:
                detalhes = "; ".join(
                    f"{s['nome']}: R$ {s['preco']:.2f}" for s in filtrados
                )
                return f"O valor encontrado no catálogo da TechFix é — {detalhes}."

        # Regra geral: listar todos os serviços e preços do MySQL
        lista_formatada = "; ".join(
            f"{s['nome']} (R$ {s['preco']:.2f})" for s in servicos
        )
        return f"Atualmente oferecemos os seguintes serviços na TechFix: {lista_formatada}."

    # 4. Fallback
    return (
        "Desculpe, não consegui entender sua solicitação dentro do meu escopo. "
        "Na TechFix, posso informar sobre nossos serviços disponíveis, preços, "
        "horário de funcionamento e endereço da loja."
    )
