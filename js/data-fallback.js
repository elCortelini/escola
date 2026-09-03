const fallbackQuestions = [
    { id: "Q01", title: "1. Avaliação das Aulas", cat: "Ensino", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q02", title: "2. Entendimento das Explicações", cat: "Ensino", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q03", title: "3. Recebimento de Ajuda nas Dificuldades", cat: "Ensino", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q04", title: "4. Qualidade das Atividades nas Aulas", cat: "Ensino", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q05", title: "5. Avaliação dos Professores", cat: "Professores", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q06", title: "6. Respeito e Tratamento dos Professores", cat: "Professores", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q07", title: "7. Organização da Turma para Aprender", cat: "Convivência", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q08", title: "8. Convivência entre os Estudantes", cat: "Convivência", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q09", title: "9. Sensação de Segurança na Escola", cat: "Segurança", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q10", title: "10. Atuação contra Bullying/Brigas", cat: "Segurança", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q11", title: "11. Avaliação do Trabalho da Direção", cat: "Gestão", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q12", title: "12. Escuta pela Direção / Orientação", cat: "Gestão", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q13", title: "13. Organização Geral da Escola", cat: "Gestão", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q14", title: "14. Limpeza Geral da Escola", cat: "Estrutura", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q15", title: "15. Conforto das Salas de Aula", cat: "Estrutura", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q16", title: "16. Estado dos Banheiros", cat: "Estrutura", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q17", title: "17. Espaços de Recreio e Convivência", cat: "Estrutura", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q18", title: "18. Qualidade da Merenda Escolar", cat: "Alimentação", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q19", title: "19. Clima e Organização do Recreio", cat: "Convivência", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q20", title: "20. Projetos e Atividades Diferenciadas", cat: "Ensino", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q23", title: "23. Avaliação Geral do Pedro Rizzi", cat: "Geral", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q24", title: "24. Gosto por Estudar na Escola", cat: "Geral", score: 0, p6: 0, p7: 0, p8: 0 },
    { id: "Q25", title: "25. Recomendação da Escola a Amigos", cat: "Geral", score: 0, p6: 0, p7: 0, p8: 0 }
];

const fallbackStats = {
    totalResponses: 0,
    satisfactionGlobal: 0,
    topBest: "Aguardando Conexão...",
    topWorst: "Aguardando Conexão..."
};
