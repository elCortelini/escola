const fallbackQuestions = [
    { id: "Q01", title: "1. Avaliação das Aulas", cat: "Ensino", score: 82.3, p6: 85.2, p7: 82.0, p8: 79.5 },
    { id: "Q02", title: "2. Entendimento das Explicações", cat: "Ensino", score: 79.1, p6: 82.0, p7: 78.5, p8: 76.5 },
    { id: "Q03", title: "3. Recebimento de Ajuda nas Dificuldades", cat: "Ensino", score: 75.4, p6: 78.1, p7: 74.2, p8: 73.5 },
    { id: "Q04", title: "4. Qualidade das Atividades nas Aulas", cat: "Ensino", score: 80.0, p6: 83.4, p7: 79.0, p8: 77.2 },
    { id: "Q05", title: "5. Avaliação dos Professores", cat: "Professores", score: 86.4, p6: 89.1, p7: 86.0, p8: 84.0 },
    { id: "Q06", title: "6. Respeito e Tratamento dos Professores", cat: "Professores", score: 84.1, p6: 87.2, p7: 83.5, p8: 81.5 },
    { id: "Q07", title: "7. Organização da Turma para Aprender", cat: "Convivência", score: 62.5, p6: 66.0, p7: 61.5, p8: 60.0 },
    { id: "Q08", title: "8. Convivência entre os Estudantes", cat: "Convivência", score: 58.2, p6: 62.1, p7: 57.0, p8: 55.4 },
    { id: "Q09", title: "9. Sensação de Segurança na Escola", cat: "Segurança", score: 52.4, p6: 56.0, p7: 53.0, p8: 48.1 },
    { id: "Q10", title: "10. Atuação contra Bullying/Brigas", cat: "Segurança", score: 46.5, p6: 50.2, p7: 47.1, p8: 42.0 },
    { id: "Q11", title: "11. Avaliação do Trabalho da Direção", cat: "Gestão", score: 78.0, p6: 81.2, p7: 77.0, p8: 75.5 },
    { id: "Q12", title: "12. Escuta pela Direção / Orientação", cat: "Gestão", score: 76.5, p6: 79.0, p7: 76.0, p8: 74.2 },
    { id: "Q13", title: "13. Organização Geral da Escola", cat: "Gestão", score: 73.2, p6: 76.0, p7: 73.0, p8: 70.5 },
    { id: "Q14", title: "14. Limpeza Geral da Escola", cat: "Estrutura", score: 42.1, p6: 46.5, p7: 41.2, p8: 38.4 },
    { id: "Q15", title: "15. Conforto das Salas de Aula", cat: "Estrutura", score: 65.0, p6: 68.0, p7: 64.5, p8: 62.5 },
    { id: "Q16", title: "16. Estado dos Banheiros", cat: "Estrutura", score: 34.2, p6: 38.0, p7: 35.0, p8: 29.5 },
    { id: "Q17", title: "17. Espaços de Recreio e Convivência", cat: "Estrutura", score: 51.2, p6: 55.0, p7: 50.5, p8: 48.0 },
    { id: "Q18", title: "18. Qualidade da Merenda Escolar", cat: "Alimentação", score: 77.2, p6: 81.0, p7: 76.5, p8: 74.0 },
    { id: "Q19", title: "19. Clima e Organização do Recreio", cat: "Convivência", score: 60.1, p6: 64.0, p7: 59.0, p8: 57.2 },
    { id: "Q20", title: "20. Projetos e Atividades Diferenciadas", cat: "Ensino", score: 72.0, p6: 75.0, p7: 71.5, p8: 69.5 },
    { id: "Q23", title: "23. Avaliação Geral do Pedro Rizzi", cat: "Geral", score: 75.0, p6: 78.5, p7: 74.0, p8: 72.0 },
    { id: "Q24", title: "24. Gosto por Estudar na Escola", cat: "Geral", score: 78.2, p6: 81.0, p7: 78.0, p8: 75.5 },
    { id: "Q25", title: "25. Recomendação da Escola a Amigos", cat: "Geral", score: 74.0, p6: 77.0, p7: 73.5, p8: 71.2 }
];

const fallbackStats = {
    totalResponses: 183,
    satisfactionGlobal: 71.4,
    topBest: "Professores (86.4%)",
    topWorst: "Banheiros (34.2%)"
};
