CREATE DATABASE IF NOT EXISTS techfix_db;
USE techfix_db;

CREATE TABLE IF NOT EXISTS servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL
);

INSERT INTO servicos (nome, preco) VALUES
('Troca de Tela', 350.00),
('Formatação de Notebook', 120.00),
('Substituição de Bateria', 220.00);
