import os
from flask import Flask, jsonify
import mysql.connector
from dotenv import load_dotenv

from routes.servicos_routes import servicos_bp
from routes.chatbot_routes import chatbot_bp

load_dotenv()

app = Flask(__name__)

# Registro dos Blueprints
app.register_blueprint(servicos_bp)
app.register_blueprint(chatbot_bp)


@app.errorhandler(mysql.connector.Error)
def handle_mysql_error(_error):
    """Captura falhas de conexão/execução do MySQL sem expor detalhes internos."""
    return (
        jsonify(
            {
                "erro": "Serviço temporariamente indisponível. Não foi possível conectar ao banco de dados."
            }
        ),
        503,
    )


if __name__ == "__main__":
    porta = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=porta, debug=debug)
