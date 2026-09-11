/**
 * gestao-data.js - Banco de Dados LocalStorage & Dados Iniciais para o SIGE
 * Centro Educacional Pedro Rizzi
 */

const SIGE_STORAGE_KEY = "sige_pedro_rizzi_db_v1";

// Estrutura Padrão Inicial
const defaultSigeData = {
    currentRole: "direcao", // direcao, orientacao, supervisao, secretaria, admin, comunidade
    agendamentosOP: [
        {
            id: "op-101",
            aluno: "Lucas Gabriel Santos",
            turma: "7º Ano A",
            responsavel: "Mariana Santos (Mãe)",
            telefone: "47998877665",
            orientadora: "Orientadora 1 (Carmen)",
            data: "2026-09-10",
            horario: "08:30",
            turno: "matutino", // matutino ou vespertino
            tipo: "agendado", // agendado ou emergencial
            motivo: "Acompanhamento de rendimento escolar em Matemática e assiduidade.",
            statusSecretaria: "realizado", // pendente, aguardando, realizado, ausente, cancelado
            obsSecretaria: "Mãe compareceu pontualmente. Atendido pela orientadora Carmen.",
            registradoPor: "Secretaria",
            criadoEm: "2026-09-09T10:00:00"
        },
        {
            id: "op-102",
            aluno: "Enzo Henrique Lima",
            turma: "8º Ano B",
            responsavel: "Roberto Lima (Pai)",
            telefone: "47991234567",
            orientadora: "Orientadora 2 (Luciana)",
            data: "2026-09-10",
            horario: "10:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Conflito interpessoal durante o intervalo de aulas.",
            statusSecretaria: "aguardando",
            chegadaEm: "2026-09-10T09:55:00",
            obsSecretaria: "Pai chegou na recepção e aguarda atendimento.",
            registradoPor: "Orientação",
            criadoEm: "2026-09-09T14:30:00"
        },
        {
            id: "op-103",
            aluno: "Sophia Oliveira",
            turma: "6º Ano C",
            responsavel: "Carla Oliveira (Mãe)",
            telefone: "47988332211",
            orientadora: "Orientadora 1 (Carmen)",
            data: "2026-09-10",
            horario: "11:00",
            turno: "matutino",
            tipo: "emergencial",
            motivo: "🚨 VAGA EMERGENCIAL: Aluna em crise de ansiedade durante avaliação de Português.",
            statusSecretaria: "realizado",
            obsSecretaria: "Atendimento imediato realizado. Mãe acionada para buscar aluna.",
            registradoPor: "Profª Ana (Português)",
            criadoEm: "2026-09-10T08:10:00"
        },
        {
            id: "op-104",
            aluno: "Matheus Vinicius",
            turma: "8º Ano A",
            responsavel: "Juliana Vinicius",
            telefone: "47997711223",
            orientadora: "Orientadora 2 (Luciana)",
            data: "2026-09-10",
            horario: "14:00",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Orientação sobre adaptação curricular e atividades complementares.",
            statusSecretaria: "pendente",
            obsSecretaria: "",
            registradoPor: "Secretaria",
            criadoEm: "2026-09-08T16:00:00"
        }
    ],

    demandasSupervisao: [
        {
            id: "sup-201",
            titulo: "Conselho de Classe Intermediário - 7º Anos",
            turmaOuProfessor: "Professores do 7º Ano",
            envolvidos: "Orientação Pedagógica (OP), Direção Escolar",
            categoria: "Conselho de Classe",
            prioridade: "alta", // alta, media, baixa
            turno: "matutino", // matutino, vespertino, ambos
            dataInicio: "2026-09-08",
            dataFim: "2026-09-10", // Multi-dias! (3 dias: Terça a Quinta)
            status: "em_atendimento", // pendente, em_atendimento, resolvido, adiado, nao_resolvido, reformular
            descricao: "Revisão dos critérios de avaliação e acompanhamento de alunos com dificuldades.",
            responsavel: "Supervisora 1",
            prazo: "2026-09-10",
            criadoEm: "2026-09-07"
        },
        {
            id: "sup-202",
            titulo: "Observação de Sala de Aula - 6º Ano B",
            turmaOuProfessor: "Turma 6º Ano B",
            envolvidos: "Professores / Docentes",
            categoria: "Observação de Sala",
            prioridade: "media",
            turno: "vespertino",
            dataInicio: "2026-09-10",
            dataFim: "2026-09-10",
            status: "pendente",
            descricao: "Acompanhar dinamismos e nível de engajamento durante aulas de História.",
            responsavel: "Supervisora 2",
            prazo: "2026-09-10",
            criadoEm: "2026-09-09"
        },
        {
            id: "sup-203",
            titulo: "Capacitação Docente: Uso de Metodologias Ativas",
            turmaOuProfessor: "Corpo Docente Fund. II",
            envolvidos: "Professores / Docentes, Direção Escolar",
            categoria: "Capacitação Docente",
            prioridade: "alta",
            turno: "vespertino",
            dataInicio: "2026-09-11",
            dataFim: "2026-09-12",
            status: "pendente",
            descricao: "Oficina prática sobre avaliação formativa e ensino híbrido.",
            responsavel: "Equipe Supervisão",
            prazo: "2026-09-12",
            criadoEm: "2026-09-08"
        }
    ],

    projetosSupervisao: [
        {
            id: "proj-101",
            titulo: "🔬 1ª Feira de Ciências e Inovação Rizzi",
            categoria: "Feira de Ciências",
            descricao: "Apresentação de trabalhos científicos e experimentos práticos dos alunos do 6º ao 9º ano.",
            dataInicio: "2026-09-01",
            dataFim: "2026-10-15",
            responsavelLider: "Supervisora 1",
            professoresEnvolvidos: "Prof. Ricardo (Ciências), Profª Maria (Física), Prof. Lucas (Robótica)",
            status: "atencao", // em_dia, atencao, atrasado, concluido
            etapas: [
                { id: "e-1", titulo: "Definição dos temas pelas turmas", dataLimite: "2026-09-10", responsavel: "Prof. Ricardo", concluido: true },
                { id: "e-2", titulo: "Entrega da lista de materiais de consumo para a Secretaria", dataLimite: "2026-09-15", responsavel: "Profª Maria", concluido: false },
                { id: "e-3", titulo: "Ensaio geral de apresentação nos estandes", dataLimite: "2026-10-08", responsavel: "Prof. Lucas", concluido: false }
            ],
            checklistPreEvento: [
                { item: "Som e Microfones testados na Quadra", concluido: false },
                { item: "Mesas e bancadas organizadas por turma", concluido: true },
                { item: "Convite aos pais enviado no WhatsApp", concluido: true },
                { item: "Certificados impressos para premiação", concluido: false }
            ]
        },
        {
            id: "proj-102",
            titulo: "📖 Projeto Maratona de Leitura & Poesia",
            categoria: "Projeto Leitura",
            descricao: "Incentivo à leitura literária com feira do livro e récitas de poesia.",
            dataInicio: "2026-09-05",
            dataFim: "2026-09-30",
            responsavelLider: "Supervisora 2",
            professoresEnvolvidos: "Profª Carmen (Português), Profª Juliana (Artes)",
            status: "em_dia",
            etapas: [
                { id: "e-21", titulo: "Seleção do acervo literário com os alunos", dataLimite: "2026-09-12", responsavel: "Profª Carmen", concluido: true },
                { id: "e-22", titulo: "Confecção dos cenários no Ateliê de Artes", dataLimite: "2026-09-22", responsavel: "Profª Juliana", concluido: false }
            ],
            checklistPreEvento: [
                { item: "Livros expostos no pátio central", concluido: true },
                { item: "Roteiro das apresentações poéticas finalizado", concluido: false }
            ]
        }
    ],

    projetosOrientacao: [
        {
            id: "proj-op-101",
            titulo: "🧠 Programa de Mediação de Conflitos & Cultura de Paz",
            categoria: "Mediação de Conflitos",
            descricao: "Oficinas de inteligência emocional, escuta ativa e resolução pacífica de atritos interpessoais entre turmas do 6º ao 9º ano.",
            dataInicio: "2026-09-01",
            dataFim: "2026-11-30",
            orientadoraLider: "Orientadora 1 (Carmen)",
            envolvidos: "Professores de Educação Física, Psicopedagoga, Direção Escolar",
            status: "em_dia",
            etapas: [
                { id: "e-op-1", titulo: "Rodas de conversa sobre convivência nas turmas do 7º ano", dataLimite: "2026-09-18", responsavel: "Orientadora Carmen", concluido: true },
                { id: "e-op-2", titulo: "Mapeamento de alunos líderes mediadores de cada turma", dataLimite: "2026-09-28", responsavel: "Orientadora Luciana", concluido: false },
                { id: "e-op-3", titulo: "Oficina prática com os pais sobre escuta não-violenta em casa", dataLimite: "2026-10-20", responsavel: "Orientadora Carmen", concluido: false }
            ],
            checklistAcompanhamento: [
                { item: "Termos de compromisso de convivência assinados nas turmas", concluido: true },
                { item: "Relatório de redução de ocorrências encaminhado à Direção", concluido: false },
                { item: "Painel de sentimentos montado no corredor da Orientação", concluido: true }
            ]
        },
        {
            id: "proj-op-102",
            titulo: "📈 Projeto Busca Ativa & Assiduidade Escolar 3º Trimestre",
            categoria: "Assiduidade & Frequência",
            descricao: "Acompanhamento intensivo de alunos com infrequência escolar superior a 15%, contato com famílias e rede de proteção.",
            dataInicio: "2026-09-05",
            dataFim: "2026-10-25",
            orientadoraLider: "Orientadora 2 (Luciana)",
            envolvidos: "Secretaria Escolar, Conselho Tutelar, Regentes de Turma",
            status: "atencao",
            etapas: [
                { id: "e-op-21", titulo: "Levantamento das listas de faltas quinzenais com a Secretaria", dataLimite: "2026-09-12", responsavel: "Secretaria / Luciana", concluido: true },
                { id: "e-op-22", titulo: "Convocação individual dos pais de 12 alunos com frequência crítica", dataLimite: "2026-09-20", responsavel: "Orientadora Luciana", concluido: false },
                { id: "e-op-23", titulo: "Notificação oficial enviada à Rede de Proteção / Conselho", dataLimite: "2026-10-05", responsavel: "Orientadora Luciana", concluido: false }
            ],
            checklistAcompanhamento: [
                { item: "Fichas FICAI preenchidas para casos acima de 25%", concluido: false },
                { item: "Encaminhamentos ao Posto de Saúde / CRAS efetuados", concluido: true }
            ]
        }
    ],

    atividadesExternasSupervisao: [
        {
            id: "ext-301",
            titulo: "🚌 Aula Passeio ao Museu Oceanográfico de Piçarras",
            destino: "Museu Oceanográfico Univali - Balneário Piçarras / SC",
            data: "2026-09-25",
            horarioSaida: "07:30",
            horarioRetorno: "12:00",
            responsavel: "Supervisora 1",
            professoresAcompanhantes: "Prof. Ricardo (Ciências), Profª Carla (Geografia)",
            turmasEnvolvidas: "7º Ano A e 7º Ano B",
            transporteContratado: "Viação Catarinense - 2 Ônibus Executivos",
            autorizacoesAssinadas: 48,
            totalAlunos: 52,
            checklistLogistica: [
                { item: "Contrato de Ônibus Assinado e Pago", concluido: true },
                { item: "Autorização dos Pais Coletada (Recepção)", concluido: true },
                { item: "Kit Primeiros Socorros Preparado", concluido: false },
                { item: "Lanche de Campo Embalado pela Cozinha", concluido: false }
            ]
        }
    ],

    reunioesPedagogicasSupervisao: [
        {
            id: "reun-401",
            titulo: "📌 HATP: Alinhamento de Avaliações do 3º Trimestre",
            tipo: "HATP / Formação",
            data: "2026-09-17",
            horario: "18:00",
            local: "Auditório Principal",
            pauta: "Discutir critérios de elaboração de provas, prazos de digitação e recuperação paralela.",
            responsavel: "Supervisora 1 & Supervisora 2",
            participantes: "Todos os Professores do Fundamental II",
            confirmadosCount: 14,
            totalConvocados: 18
        }
    ],

    demandasAdmin: [
        {
            id: "adm-301",
            titulo: "Troca da Lâmpada e Projetor da Sala 12",
            setor: "Manutenção & TI",
            prioridade: "alta",
            status: "em_atendimento",
            descricao: "Projetor apresentando oscilação na imagem. Necessário reparo antes das aulas de Geografia.",
            responsavel: "Seção de Apoio / TI",
            prazo: "2026-09-11",
            criadoEm: "2026-09-09"
        },
        {
            id: "adm-302",
            titulo: "Reposição de Papel A4 e Cartuchos na Sala dos Professores",
            setor: "Suprimentos",
            prioridade: "media",
            status: "concluido",
            descricao: "Solicitação atendida com 10 caixas de papel sulfite e 2 toners pretos.",
            responsavel: "Almoxarifado",
            prazo: "2026-09-09",
            criadoEm: "2026-09-08"
        }
    ],

    muralAvisos: [
        {
            id: "av-401",
            titulo: "📢 Reunião Geral de Alinhamento Pedagógico",
            conteudo: "Convocamos todos os professores da Rede Fundamental para a reunião mensal no Auditório Principal sobre o Simulado do 3º Trimestre.",
            target: "professores", // todos, professores, alunos, orientacao_supervisao
            urgente: true,
            autor: "Direção Escolar",
            data: "2026-09-10",
            validoAte: "2026-09-15"
        },
        {
            id: "av-402",
            titulo: "🏆 Feira de Ciências e Tecnologia Rizzi 2026",
            conteudo: "Abertas as inscrições de grupos de alunos do 6º ao 8º ano para a submissão de projetos da Feira Científica.",
            target: "todos",
            urgente: false,
            autor: "Supervisão Pedagógica",
            data: "2026-09-08",
            validoAte: "2026-09-30"
        },
        {
            id: "av-403",
            titulo: "📝 Prazo para Lançamento das Faltas no Portal",
            conteudo: "Lembramos aos docentes que a consolidação da frequência da primeira quinzena deve ocorrer até sexta-feira.",
            target: "professores",
            urgente: false,
            autor: "Secretaria Escolar",
            data: "2026-09-07",
            validoAte: "2026-09-12"
        }
    ],

    calendarioTarefas: [
        {
            id: "cal-501",
            responsavel: "Prof. Carmen (Orientação)",
            tarefa: "Consolidação dos relatórios de atendimento quinzenal para a Direção",
            quando: "2026-09-11",
            destinatario: "Orientação Pedagógica",
            status: "pendente"
        },
        {
            id: "cal-502",
            responsavel: "Secretaria",
            tarefa: "Emissão e assinatura dos comprovantes de presença dos atendimentos da OP",
            quando: "2026-09-10",
            destinatario: "Secretaria",
            status: "em_andamento"
        },
        {
            id: "cal-503",
            responsavel: "Professores do 7º Ano",
            tarefa: "Entrega do planejamento de aulas práticas para o mês de Outubro",
            quando: "2026-09-18",
            destinatario: "Professores",
            status: "pendente"
        }
    ],

    notificacoesLidas: [],

    whatsappConfig: {
        enabled: true,
        provider: "simulated", // simulated, meta_cloud_api, zapi, evolution_api, custom_webhook
        apiUrl: "",
        apiToken: "",
        autoSendOnCreate: true,
        autoSendOnArrival: true,
        autoSendReminders: true
    },

    orientadoras: [
        {
            id: "orient-1",
            nome: "Orientadora 1 (Carmen)",
            telefone: "47999112233",
            email: "carmen.op@escola.gov.br"
        },
        {
            id: "orient-2",
            nome: "Orientadora 2 (Luciana)",
            telefone: "47999445566",
            email: "luciana.op@escola.gov.br"
        }
    ],

    supervisoras: [
        {
            id: "sup-user-1",
            nome: "Supervisora 1",
            telefone: "47999778899",
            email: "supervisao1@escola.gov.br"
        },
        {
            id: "sup-user-2",
            nome: "Supervisora 2",
            telefone: "47999778800",
            email: "supervisao2@escola.gov.br"
        }
    ],

    professores: [
        {
            id: "prof-1",
            nome: "Prof. Ricardo Santos",
            disciplina: "Ciências & Biologia",
            telefone: "47998877665",
            email: "ricardo.santos@escola.gov.br",
            turnos: "matutino",
            turmas: "6º ao 9º Ano"
        },
        {
            id: "prof-2",
            nome: "Profª Maria Oliveira",
            disciplina: "Física & Matemática",
            telefone: "47991234567",
            email: "maria.oliveira@escola.gov.br",
            turnos: "ambos",
            turmas: "8º e 9º Anos"
        },
        {
            id: "prof-3",
            nome: "Profª Carmen Lucia",
            disciplina: "Língua Portuguesa",
            telefone: "47988332211",
            email: "carmen.lucia@escola.gov.br",
            turnos: "matutino",
            turmas: "6º ao 8º Ano"
        },
        {
            id: "prof-4",
            nome: "Prof. Lucas Gabriel",
            disciplina: "Robótica & TI",
            telefone: "47997711223",
            email: "lucas.gabriel@escola.gov.br",
            turnos: "vespertino",
            turmas: "Todos os Anos"
        },
        {
            id: "prof-5",
            nome: "Profª Juliana Lima",
            disciplina: "Artes & Projetos",
            telefone: "47996655443",
            email: "juliana.lima@escola.gov.br",
            turnos: "vespertino",
            turmas: "6º ao 9º Ano"
        }
    ],

    equipeEscola: [
        {
            id: "prof-1",
            nome: "Prof. Ricardo Santos",
            setor: "docentes",
            cargoFuncao: "Professor de Ciências & Biologia",
            disciplina: "Ciências & Biologia",
            telefone: "47998877665",
            email: "ricardo.santos@escola.gov.br",
            turnos: "matutino",
            turmasOuSalas: "6º ao 9º Ano"
        },
        {
            id: "prof-2",
            nome: "Profª Maria Oliveira",
            setor: "docentes",
            cargoFuncao: "Professora de Física & Matemática",
            disciplina: "Física & Matemática",
            telefone: "47991234567",
            email: "maria.oliveira@escola.gov.br",
            turnos: "ambos",
            turmasOuSalas: "8º e 9º Anos"
        },
        {
            id: "prof-3",
            nome: "Profª Carmen Lucia",
            setor: "docentes",
            cargoFuncao: "Professora de Língua Portuguesa",
            disciplina: "Língua Portuguesa",
            telefone: "47988332211",
            email: "carmen.lucia@escola.gov.br",
            turnos: "matutino",
            turmasOuSalas: "6º ao 8º Ano"
        },
        {
            id: "prof-4",
            nome: "Prof. Lucas Gabriel",
            setor: "docentes",
            cargoFuncao: "Professor de Robótica & TI",
            disciplina: "Robótica & TI",
            telefone: "47997711223",
            email: "lucas.gabriel@escola.gov.br",
            turnos: "vespertino",
            turmasOuSalas: "Todos os Anos"
        },
        {
            id: "prof-5",
            nome: "Profª Juliana Lima",
            setor: "docentes",
            cargoFuncao: "Professora de Artes & Projetos",
            disciplina: "Artes & Projetos",
            telefone: "47996655443",
            email: "juliana.lima@escola.gov.br",
            turnos: "vespertino",
            turmasOuSalas: "6º ao 9º Ano"
        },
        {
            id: "orient-1",
            nome: "Carmen Lucia (Orientadora)",
            setor: "orientacao",
            cargoFuncao: "Orientadora Pedagógica - Matutino",
            disciplina: "Orientação Pedagógica",
            telefone: "47999112233",
            email: "carmen.op@escola.gov.br",
            turnos: "matutino",
            turmasOuSalas: "6º ao 9º Anos"
        },
        {
            id: "orient-2",
            nome: "Luciana Santos (Orientadora)",
            setor: "orientacao",
            cargoFuncao: "Orientadora Pedagógica - Vespertino",
            disciplina: "Orientação Pedagógica",
            telefone: "47999445566",
            email: "luciana.op@escola.gov.br",
            turnos: "vespertino",
            turmasOuSalas: "1º ao 5º Anos"
        },
        {
            id: "sup-user-1",
            nome: "Supervisora 1 (Ana Paula)",
            setor: "supervisao",
            cargoFuncao: "Supervisora Pedagógica Geral",
            disciplina: "Supervisão Pedagógica",
            telefone: "47999778899",
            email: "supervisao1@escola.gov.br",
            turnos: "matutino",
            turmasOuSalas: "Toda a Unidade"
        },
        {
            id: "sup-user-2",
            nome: "Supervisora 2 (Fernanda)",
            setor: "supervisao",
            cargoFuncao: "Supervisora Pedagógica de Projetos",
            disciplina: "Supervisão Pedagógica",
            telefone: "47999778800",
            email: "supervisao2@escola.gov.br",
            turnos: "vespertino",
            turmasOuSalas: "Toda a Unidade"
        },
        {
            id: "dir-1",
            nome: "Diretora Elena Cortelini",
            setor: "direcao",
            cargoFuncao: "Diretora Escolar Geral",
            disciplina: "Gestão Escolar",
            telefone: "47999881122",
            email: "direcao@escola.gov.br",
            turnos: "integral",
            turmasOuSalas: "Geral"
        },
        {
            id: "sec-1",
            nome: "Patricia Duarte (Secretária)",
            setor: "secretaria",
            cargoFuncao: "Chefe da Secretaria Escolar",
            disciplina: "Secretaria & Matrículas",
            telefone: "47999223344",
            email: "secretaria@escola.gov.br",
            turnos: "integral",
            turmasOuSalas: "Recepção / Secretaria"
        },
        {
            id: "apoio-1",
            nome: "Marcos Ribeiro (TI & Manutenção)",
            setor: "apoio",
            cargoFuncao: "Técnico em Suporte TI & Infraestrutura",
            disciplina: "Apoio Técnico",
            telefone: "47999334455",
            email: "ti.manutencao@escola.gov.br",
            turnos: "integral",
            turmasOuSalas: "Laboratórios & Redes"
        }
    ],

    turmasEscola: [
        { id: "turma-101", nome: "1º Ano A", turno: "matutino", anoLetivo: "2026", nivel: "Ensino Fundamental I", sala: "Sala 01", capacidade: 30, regente: "Profª Juliana Lima" },
        { id: "turma-102", nome: "2º Ano A", turno: "matutino", anoLetivo: "2026", nivel: "Ensino Fundamental I", sala: "Sala 02", capacidade: 30, regente: "Profª Maria Oliveira" },
        { id: "turma-601", nome: "6º Ano A", turno: "matutino", anoLetivo: "2026", nivel: "Ensino Fundamental II", sala: "Sala 10", capacidade: 35, regente: "Profª Carmen Lucia" },
        { id: "turma-602", nome: "6º Ano B", turno: "vespertino", anoLetivo: "2026", nivel: "Ensino Fundamental II", sala: "Sala 10", capacidade: 35, regente: "Prof. Lucas Gabriel" },
        { id: "turma-701", nome: "7º Ano A", turno: "matutino", anoLetivo: "2026", nivel: "Ensino Fundamental II", sala: "Sala 12", capacidade: 35, regente: "Prof. Ricardo Santos" },
        { id: "turma-702", nome: "7º Ano B", turno: "vespertino", anoLetivo: "2026", nivel: "Ensino Fundamental II", sala: "Sala 12", capacidade: 35, regente: "Prof. Ricardo Santos" },
        { id: "turma-801", nome: "8º Ano A", turno: "matutino", anoLetivo: "2026", nivel: "Ensino Fundamental II", sala: "Sala 14", capacidade: 35, regente: "Profª Maria Oliveira" },
        { id: "turma-802", nome: "8º Ano B", turno: "vespertino", anoLetivo: "2026", nivel: "Ensino Fundamental II", sala: "Sala 14", capacidade: 35, regente: "Prof. Lucas Gabriel" },
        { id: "turma-901", nome: "9º Ano A", turno: "matutino", anoLetivo: "2026", nivel: "Ensino Fundamental II", sala: "Sala 15", capacidade: 35, regente: "Profª Carmen Lucia" }
    ],

    configEscola: {
        nomeEscola: "Centro Educacional Pedro Rizzi",
        cidadeUf: "Itajaí / SC",
        anoLetivo: "2026",
        periodoAtual: "3º Trimestre",
        horarioMatutino: "07:30 - 11:45",
        horarioVespertino: "13:15 - 17:30",
        telefoneContato: "(47) 3348-0000",
        emailContato: "contato@pedrorizzi.sc.gov.br"
    },

    auditLogs: [
        { id: "log-1", data: "2026-09-10T14:30:00", usuario: "Administração", acao: "Cadastro de Nova Turma (7º Ano B)", setor: "Admin" },
        { id: "log-2", data: "2026-09-10T15:10:00", usuario: "Supervisão", acao: "Disparo de Cobrança WhatsApp (Prof. Ricardo)", setor: "Supervisão" },
        { id: "log-3", data: "2026-09-10T16:20:00", usuario: "Secretaria", acao: "Agendamento OP Registrado (Lucas Gabriel)", setor: "Orientação" }
    ],

    firebaseConfig: {
        enabled: true,
        apiKey: "AIzaSyCXLbIA46DkG2UQcANT_HuNnERN0pp3cgs",
        authDomain: "sas-cepr.firebaseapp.com",
        projectId: "sas-cepr",
        storageBucket: "sas-cepr.firebasestorage.app",
        messagingSenderId: "145326632209",
        appId: "1:145326632209:web:58d9e934e4a0bf26bcf0b0"
    }
};

// Gerenciador de Banco de Dados Local Storage & Firebase Cloud
class SigeDatabase {
    constructor() {
        this.data = this.load();
        this.fbApp = null;
        this.firestore = null;
        this.isSyncingFromRemote = false;
        this.initFirebase();
    }

    getFirebaseConfig() {
        if (!this.data.firebaseConfig || !this.data.firebaseConfig.projectId) {
            this.data.firebaseConfig = defaultSigeData.firebaseConfig;
            this.saveData(this.data);
        }
        return this.data.firebaseConfig;
    }

    saveFirebaseConfig(config) {
        this.data.firebaseConfig = { ...this.getFirebaseConfig(), ...config };
        this.saveData(this.data);
        this.initFirebase();
    }

    isFirebaseConnected() {
        return !!(this.firestore && this.data.firebaseConfig && this.data.firebaseConfig.projectId);
    }

    initFirebase() {
        const config = this.getFirebaseConfig();
        if (!config || !config.projectId || !config.apiKey || typeof firebase === "undefined") {
            return;
        }

        try {
            if (!firebase.apps.length) {
                this.fbApp = firebase.initializeApp(config);
            } else {
                this.fbApp = firebase.app();
            }

            this.firestore = firebase.firestore();

            this.firestore.collection("sige_pedro_rizzi").doc("database").onSnapshot((doc) => {
                if (doc.exists) {
                    const remoteData = doc.data();
                    if (remoteData && typeof remoteData === "object") {
                        this.isSyncingFromRemote = true;
                        this.data = { ...this.data, ...remoteData };
                        localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(this.data));
                        this.isSyncingFromRemote = false;
                        
                        if (typeof renderAllModules === "function") {
                            renderAllModules();
                        } else if (typeof renderModuleAdministracao === "function") {
                            renderModuleAdministracao();
                        }
                    }
                }
            }, (error) => {
                console.warn("Aviso Firebase Firestore Sync:", error.message);
            });

            console.log("🔥 Firebase Firestore inicializado com sucesso!");
        } catch (e) {
            console.error("Erro ao inicializar Firebase:", e);
        }
    }

    syncToFirebase() {
        if (this.isSyncingFromRemote || !this.firestore || !this.data.firebaseConfig || !this.data.firebaseConfig.projectId) {
            return;
        }

        try {
            this.firestore.collection("sige_pedro_rizzi").doc("database").set(this.data, { merge: true })
                .catch(err => console.warn("Erro ao sincronizar com Firebase:", err.message));
        } catch (e) {
            console.warn("Exceção ao enviar para Firebase:", e);
        }
    }

    load() {
        const stored = localStorage.getItem(SIGE_STORAGE_KEY);
        if (!stored) {
            this.saveData(defaultSigeData);
            return defaultSigeData;
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Erro ao carregar banco de dados local do SIGE:", e);
            return defaultSigeData;
        }
    }

    saveData(data) {
        this.data = data;
        localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(data));
        this.syncToFirebase();
    }

    resetToDefault() {
        this.saveData(defaultSigeData);
        window.location.reload();
    }

    // Role Manager
    getRole() {
        return this.data.currentRole || "direcao";
    }

    setRole(role) {
        this.data.currentRole = role;
        this.saveData(this.data);
    }

    // Orientação Pedagógica
    getAgendamentosOP() {
        if (!this.data || !Array.isArray(this.data.agendamentosOP)) {
            if (!this.data) this.data = {};
            this.data.agendamentosOP = defaultSigeData.agendamentosOP || [];
            this.saveData(this.data);
        }
        return this.data.agendamentosOP;
    }

    // Bloqueio de Dias / Feriados
    getDiasBloqueados() {
        return this.data.diasBloqueados || [];
    }

    isDiaBloqueado(dateIso) {
        return (this.data.diasBloqueados || []).some(d => d.data === dateIso);
    }

    toggleBloqueioDia(dateIso, motivo = "Conselho de Classe / Recesso") {
        if (!this.data.diasBloqueados) this.data.diasBloqueados = [];
        const index = this.data.diasBloqueados.findIndex(d => d.data === dateIso);
        if (index >= 0) {
            this.data.diasBloqueados.splice(index, 1);
        } else {
            this.data.diasBloqueados.push({ data: dateIso, motivo, bloqueadoPor: this.getRole() });
        }
        this.saveData(this.data);
    }

    getOrientadoras() {
        if (!this.data.orientadoras || !Array.isArray(this.data.orientadoras)) {
            this.data.orientadoras = defaultSigeData.orientadoras || [];
            this.saveData(this.data);
        }
        return this.data.orientadoras;
    }

    saveOrientadora(id, nome, telefone, email) {
        const list = this.getOrientadoras();
        const item = list.find(o => o.id === id || o.nome === nome);
        if (item) {
            if (telefone) item.telefone = telefone;
            if (email) item.email = email;
        } else {
            list.push({ id: id || ("orient-" + Date.now()), nome, telefone, email });
        }
        this.saveData(this.data);
    }

    getSupervisoras() {
        if (!this.data.supervisoras || !Array.isArray(this.data.supervisoras)) {
            this.data.supervisoras = defaultSigeData.supervisoras || [];
            this.saveData(this.data);
        }
        return this.data.supervisoras;
    }

    getProfessores() {
        if (!this.data.professores || !Array.isArray(this.data.professores)) {
            this.data.professores = defaultSigeData.professores || [];
            this.saveData(this.data);
        }
        return this.data.professores;
    }

    saveProfessor(profData) {
        let list = this.getProfessores();
        if (profData.id) {
            const index = list.findIndex(p => p.id === profData.id);
            if (index >= 0) {
                list[index] = { ...list[index], ...profData };
            } else {
                list.push(profData);
            }
        } else {
            profData.id = "prof-" + Date.now();
            list.push(profData);
        }
        this.saveData(this.data);
        return profData;
    }

    deleteProfessor(id) {
        let list = this.getProfessores();
        this.data.professores = list.filter(p => p.id !== id);
        this.saveData(this.data);
    }

    getEquipeEscolar() {
        if (!this.data.equipeEscola || !Array.isArray(this.data.equipeEscola)) {
            this.data.equipeEscola = defaultSigeData.equipeEscola || [];
            this.saveData(this.data);
        }
        return this.data.equipeEscola;
    }

    saveProfissional(profData) {
        let list = this.getEquipeEscolar();
        if (profData.id) {
            const index = list.findIndex(p => p.id === profData.id);
            if (index >= 0) {
                list[index] = { ...list[index], ...profData };
            } else {
                list.push(profData);
            }
        } else {
            profData.id = "prof-" + Date.now();
            list.push(profData);
        }
        
        if (profData.setor === "docentes") {
            this.saveProfessor(profData);
        }

        this.saveData(this.data);
        this.logAuditEvent("Equipe Escolar", `Salvo profissional ${profData.nome} (${profData.cargoFuncao || profData.setor})`, "Administração");
        return profData;
    }

    deleteProfissional(id) {
        let list = this.getEquipeEscolar();
        const prof = list.find(p => p.id === id);
        this.data.equipeEscola = list.filter(p => p.id !== id);
        this.deleteProfessor(id);
        this.saveData(this.data);
        if (prof) {
            this.logAuditEvent("Equipe Escolar", `Removido profissional ${prof.nome}`, "Administração");
        }
    }

    getTurmasEscola() {
        if (!this.data.turmasEscola || !Array.isArray(this.data.turmasEscola)) {
            this.data.turmasEscola = defaultSigeData.turmasEscola || [];
            this.saveData(this.data);
        }
        return this.data.turmasEscola;
    }

    saveTurma(turmaData) {
        let list = this.getTurmasEscola();
        if (turmaData.id) {
            const index = list.findIndex(t => t.id === turmaData.id);
            if (index >= 0) {
                list[index] = { ...list[index], ...turmaData };
            } else {
                list.push(turmaData);
            }
        } else {
            turmaData.id = "turma-" + Date.now();
            list.push(turmaData);
        }
        this.saveData(this.data);
        this.logAuditEvent("Turmas & Turnos", `Salva turma ${turmaData.nome} (${turmaData.turno})`, "Administração");
        return turmaData;
    }

    deleteTurma(id) {
        let list = this.getTurmasEscola();
        const turma = list.find(t => t.id === id);
        this.data.turmasEscola = list.filter(t => t.id !== id);
        this.saveData(this.data);
        if (turma) {
            this.logAuditEvent("Turmas & Turnos", `Removida turma ${turma.nome}`, "Administração");
        }
    }

    getConfigEscola() {
        if (!this.data.configEscola) {
            this.data.configEscola = defaultSigeData.configEscola;
            this.saveData(this.data);
        }
        return this.data.configEscola;
    }

    saveConfigEscola(configData) {
        this.data.configEscola = { ...this.getConfigEscola(), ...configData };
        this.saveData(this.data);
        this.logAuditEvent("Configuração Escolar", "Atualizados parâmetros institucionais da escola", "Administração");
        return this.data.configEscola;
    }

    getAuditLogs() {
        if (!this.data.auditLogs || !Array.isArray(this.data.auditLogs)) {
            this.data.auditLogs = defaultSigeData.auditLogs || [];
            this.saveData(this.data);
        }
        return this.data.auditLogs;
    }

    logAuditEvent(setor, acao, usuario = "Sistema") {
        let logs = this.getAuditLogs();
        const newLog = {
            id: "log-" + Date.now(),
            data: new Date().toISOString(),
            usuario,
            acao,
            setor
        };
        logs.unshift(newLog);
        if (logs.length > 100) logs = logs.slice(0, 100);
        this.data.auditLogs = logs;
        localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(this.data));
    }

    getWhatsappConfig() {
        if (!this.data.whatsappConfig) {
            this.data.whatsappConfig = {
                enabled: true,
                provider: "simulated",
                apiUrl: "",
                apiToken: "",
                autoSendOnCreate: true,
                autoSendOnArrival: true,
                autoSendReminders: true
            };
            this.saveData(this.data);
        }
        return this.data.whatsappConfig;
    }

    saveWhatsappConfig(config) {
        this.data.whatsappConfig = { ...this.getWhatsappConfig(), ...config };
        this.saveData(this.data);
    }

    logWhatsappReminder(id, tipoLembrete) {
        this.logWhatsappDispatch(id, {
            tipo: tipoLembrete === "24h" ? "Lembrete 24h" : "Lembrete no Dia",
            modo: "manual",
            status: "sucesso"
        });
    }

    logWhatsappDispatch(id, logData) {
        const ag = this.getAgendamentosOP().find(a => a.id === id);
        if (ag) {
            if (!ag.historicoWhatsapp) ag.historicoWhatsapp = [];
            ag.historicoWhatsapp.unshift({
                id: "wlog-" + Date.now() + "-" + Math.floor(Math.random()*1000),
                tipo: logData.tipo || "Notificação WhatsApp",
                mensagem: logData.mensagem || "",
                enviadoEm: new Date().toISOString(),
                modo: logData.modo || "automático", // "automático" ou "manual"
                status: logData.status || "sucesso", // "sucesso" ou "falha"
                destinatario: logData.destinatario || ag.telefone || ""
            });
            this.saveData(this.data);
        }
    }

    addAnexoOP(id, nomeArquivo, urlOuData) {
        const ag = this.data.agendamentosOP.find(a => a.id === id);
        if (ag) {
            if (!ag.anexos) ag.anexos = [];
            ag.anexos.push({
                nome: nomeArquivo,
                url: urlOuData,
                data: new Date().toISOString()
            });
            this.saveData(this.data);
        }
    }

    updateEncaminhamentoOP(id, encaminhamento, historicoTratado) {
        const ag = this.data.agendamentosOP.find(a => a.id === id);
        if (ag) {
            if (encaminhamento !== undefined) ag.encaminhamento = encaminhamento;
            if (historicoTratado !== undefined) ag.historicoTratado = historicoTratado;
            this.saveData(this.data);
        }
    }

    addAgendamentoOP(agendamento) {
        // Verifica se o dia esta bloqueado pela Direcao
        if (this.isDiaBloqueado(agendamento.data)) {
            const blockObj = this.data.diasBloqueados.find(d => d.data === agendamento.data);
            throw new Error(`Data Bloqueada pela Direção (${agendamento.data}): ${blockObj ? blockObj.motivo : 'Recesso / Conselho'}`);
        }

        // Validação estrita de limite de turno (3 Agendados + 1 Emergencial por turno)
        const dateAppointments = this.data.agendamentosOP.filter(
            a => a.data === agendamento.data && a.turno === agendamento.turno && a.statusSecretaria !== "cancelado"
        );

        const countAgendados = dateAppointments.filter(a => a.tipo === "agendado").length;
        const countEmergencial = dateAppointments.filter(a => a.tipo === "emergencial").length;

        if (agendamento.tipo === "agendado" && countAgendados >= 3) {
            throw new Error(`Limite atingido! O turno ${agendamento.turno.toUpperCase()} já possui 3 agendamentos marcados nesta data. Resta apenas 1 vaga EMERGENCIAL disponível!`);
        }

        if (agendamento.tipo === "emergencial" && countEmergencial >= 1) {
            throw new Error(`Limite atingido! O turno ${agendamento.turno.toUpperCase()} já utilizou a vaga EMERGENCIAL do dia.`);
        }

        agendamento.id = "op-" + Date.now();
        agendamento.criadoEm = new Date().toISOString();
        if (!agendamento.historicoWhatsapp) agendamento.historicoWhatsapp = [];
        if (!agendamento.anexos) agendamento.anexos = [];
        
        this.data.agendamentosOP.unshift(agendamento);
        this.saveData(this.data);
        return agendamento;
    }

    updateSecretariaStatusOP(id, status, obs = "", chegadaEm = null) {
        const ag = this.data.agendamentosOP.find(a => a.id === id);
        if (ag) {
            ag.statusSecretaria = status;
            if (obs) ag.obsSecretaria = obs;
            if (chegadaEm) ag.chegadaEm = chegadaEm;
            this.saveData(this.data);
        }
    }

    // Demandas Supervisão
    getDemandasSupervisao() {
        return this.data.demandasSupervisao || [];
    }

    addDemandaSupervisao(demanda) {
        demanda.id = "sup-" + Date.now();
        demanda.criadoEm = new Date().toISOString().split("T")[0];
        if (!demanda.dataInicio) demanda.dataInicio = demanda.prazo || demanda.criadoEm;
        if (!demanda.dataFim) demanda.dataFim = demanda.dataInicio;
        if (!demanda.turno) demanda.turno = "matutino";
        if (!demanda.categoria) demanda.categoria = "Planejamento Pedagógico";

        if (!this.data.demandasSupervisao) this.data.demandasSupervisao = [];
        this.data.demandasSupervisao.unshift(demanda);
        this.saveData(this.data);
        return demanda;
    }

    updateStatusDemandaSupervisao(id, status) {
        const d = this.data.demandasSupervisao.find(item => item.id === id);
        if (d) {
            d.status = status;
            this.saveData(this.data);
        }
    }

    // Projetos Institucionais da Supervisão
    getProjetosSupervisao() {
        if (!this.data.projetosSupervisao || !Array.isArray(this.data.projetosSupervisao)) {
            this.data.projetosSupervisao = defaultSigeData.projetosSupervisao || [];
            this.saveData(this.data);
        }
        return this.data.projetosSupervisao;
    }

    addProjetoSupervisao(proj) {
        proj.id = "proj-" + Date.now();
        if (!proj.etapas) proj.etapas = [];
        if (!proj.checklistPreEvento) proj.checklistPreEvento = [];
        if (!proj.status) proj.status = "em_dia";
        if (!this.data.projetosSupervisao) this.data.projetosSupervisao = [];
        this.data.projetosSupervisao.unshift(proj);
        this.saveData(this.data);
        return proj;
    }

    toggleEtapaProjetoSupervisao(projId, etapaId) {
        const p = (this.getProjetosSupervisao()).find(item => item.id === projId);
        if (p && p.etapas) {
            const et = p.etapas.find(e => e.id === etapaId);
            if (et) et.concluido = !et.concluido;
            this.saveData(this.data);
        }
    }

    toggleChecklistProjetoSupervisao(projId, index) {
        const p = (this.getProjetosSupervisao()).find(item => item.id === projId);
        if (p && p.checklistPreEvento && p.checklistPreEvento[index]) {
            p.checklistPreEvento[index].concluido = !p.checklistPreEvento[index].concluido;
            this.saveData(this.data);
        }
    }

    // Projetos Continuados de Período Variado da Orientação Pedagógica (OP)
    getProjetosOrientacao() {
        if (!this.data.projetosOrientacao || !Array.isArray(this.data.projetosOrientacao)) {
            this.data.projetosOrientacao = defaultSigeData.projetosOrientacao || [];
            this.saveData(this.data);
        }
        return this.data.projetosOrientacao;
    }

    addProjetoOrientacao(proj) {
        proj.id = "proj-op-" + Date.now();
        if (!proj.etapas) proj.etapas = [];
        if (!proj.checklistAcompanhamento) proj.checklistAcompanhamento = [];
        if (!proj.status) proj.status = "em_dia";
        if (!this.data.projetosOrientacao) this.data.projetosOrientacao = [];
        this.data.projetosOrientacao.unshift(proj);
        this.saveData(this.data);
        this.logAuditEvent("Orientação Pedagógica", `Criado projeto continuado: ${proj.titulo}`, "Orientação");
        return proj;
    }

    toggleEtapaProjetoOrientacao(projId, etapaId) {
        const p = (this.getProjetosOrientacao()).find(item => item.id === projId);
        if (p && p.etapas) {
            const et = p.etapas.find(e => e.id === etapaId);
            if (et) et.concluido = !et.concluido;
            this.saveData(this.data);
        }
    }

    toggleChecklistProjetoOrientacao(projId, index) {
        const p = (this.getProjetosOrientacao()).find(item => item.id === projId);
        if (p && p.checklistAcompanhamento && p.checklistAcompanhamento[index]) {
            p.checklistAcompanhamento[index].concluido = !p.checklistAcompanhamento[index].concluido;
            this.saveData(this.data);
        }
    }

    deleteProjetoOrientacao(id) {
        let list = this.getProjetosOrientacao();
        this.data.projetosOrientacao = list.filter(p => p.id !== id);
        this.saveData(this.data);
        this.logAuditEvent("Orientação Pedagógica", `Removido projeto continuado ID: ${id}`, "Orientação");
    }

    // Atividades Externas / Aulas Passeio
    getAtividadesExternasSupervisao() {
        if (!this.data.atividadesExternasSupervisao || !Array.isArray(this.data.atividadesExternasSupervisao)) {
            this.data.atividadesExternasSupervisao = defaultSigeData.atividadesExternasSupervisao || [];
            this.saveData(this.data);
        }
        return this.data.atividadesExternasSupervisao;
    }

    addAtividadeExternaSupervisao(act) {
        act.id = "ext-" + Date.now();
        if (!act.checklistLogistica) act.checklistLogistica = [];
        if (!this.data.atividadesExternasSupervisao) this.data.atividadesExternasSupervisao = [];
        this.data.atividadesExternasSupervisao.unshift(act);
        this.saveData(this.data);
        return act;
    }

    toggleChecklistAtividadeExterna(actId, index) {
        const a = (this.getAtividadesExternasSupervisao()).find(item => item.id === actId);
        if (a && a.checklistLogistica && a.checklistLogistica[index]) {
            a.checklistLogistica[index].concluido = !a.checklistLogistica[index].concluido;
            this.saveData(this.data);
        }
    }

    // Reuniões Pedagógicas & HATP
    getReunioesPedagogicasSupervisao() {
        if (!this.data.reunioesPedagogicasSupervisao || !Array.isArray(this.data.reunioesPedagogicasSupervisao)) {
            this.data.reunioesPedagogicasSupervisao = defaultSigeData.reunioesPedagogicasSupervisao || [];
            this.saveData(this.data);
        }
        return this.data.reunioesPedagogicasSupervisao;
    }

    addReuniaoPedagogicaSupervisao(reun) {
        reun.id = "reun-" + Date.now();
        if (!this.data.reunioesPedagogicasSupervisao) this.data.reunioesPedagogicasSupervisao = [];
        this.data.reunioesPedagogicasSupervisao.unshift(reun);
        this.saveData(this.data);
        return reun;
    }

    // Demandas Administração
    getDemandasAdmin() {
        return this.data.demandasAdmin || [];
    }

    addDemandaAdmin(demanda) {
        demanda.id = "adm-" + Date.now();
        demanda.criadoEm = new Date().toISOString().split("T")[0];
        this.data.demandasAdmin.unshift(demanda);
        this.saveData(this.data);
        return demanda;
    }

    updateStatusDemandaAdmin(id, status) {
        const d = this.data.demandasAdmin.find(item => item.id === id);
        if (d) {
            d.status = status;
            this.saveData(this.data);
        }
    }

    // Mural de Avisos
    getMuralAvisos() {
        return this.data.muralAvisos || [];
    }

    addAviso(aviso) {
        aviso.id = "av-" + Date.now();
        aviso.data = new Date().toISOString().split("T")[0];
        this.data.muralAvisos.unshift(aviso);
        this.saveData(this.data);
        return aviso;
    }

    // Calendário de Tarefas
    getCalendarioTarefas() {
        return this.data.calendarioTarefas || [];
    }

    addTarefaCalendario(tarefa) {
        tarefa.id = "cal-" + Date.now();
        this.data.calendarioTarefas.unshift(tarefa);
        this.saveData(this.data);
        return tarefa;
    }

    toggleStatusTarefa(id) {
        const t = this.data.calendarioTarefas.find(item => item.id === id);
        if (t) {
            t.status = t.status === "concluido" ? "pendente" : "concluido";
            this.saveData(this.data);
        }
    }

    // Notificações Inteligentes Filtadas por Perfil
    getNotificacoesPertinentes() {
        const role = this.getRole();
        const list = [];
        const hojeStr = new Date().toISOString().split("T")[0];

        // 1. Orientação Pedagógica
        if (role === "orientacao" || role === "direcao" || role === "admin") {
            const emergenciasHoje = this.getAgendamentosOP().filter(a => a.tipo === "emergencial" && a.statusSecretaria === "pendente");
            emergenciasHoje.forEach(e => {
                list.push({
                    id: `notif-op-${e.id}`,
                    title: `🚨 Vaga Emergencial OP!`,
                    desc: `Atendimento urgente para ${e.aluno} (${e.turma}).`,
                    time: `Turno ${e.turno.toUpperCase()}`,
                    targetTab: "op",
                    unread: !this.data.notificacoesLidas.includes(`notif-op-${e.id}`)
                });
            });

            const aguardandoHoje = this.getAgendamentosOP().filter(a => a.statusSecretaria === "aguardando");
            aguardandoHoje.forEach(a => {
                list.push({
                    id: `notif-wait-${a.id}`,
                    title: `🔔 Aluno Aguardando na Recepção!`,
                    desc: `${a.aluno} (${a.turma}) chegou e aguarda (${a.orientadora || 'Orientação'}).`,
                    time: a.chegadaEm ? `Chegou às ${a.chegadaEm.split("T")[1]?.substring(0,5) || ''}` : "Recepção",
                    targetTab: "op",
                    unread: !this.data.notificacoesLidas.includes(`notif-wait-${a.id}`)
                });
            });
        }

        // 2. Secretaria
        if (role === "secretaria" || role === "direcao" || role === "admin") {
            const opPendentes = this.getAgendamentosOP().filter(a => a.statusSecretaria === "pendente");
            if (opPendentes.length > 0) {
                list.push({
                    id: `notif-sec-op`,
                    title: `📝 Confirmação da OP Pendente (${opPendentes.length})`,
                    desc: `Existem atendimentos de hoje que aguardam OK de presença da Secretaria.`,
                    time: `Ação necessária`,
                    targetTab: "op",
                    unread: !this.data.notificacoesLidas.includes(`notif-sec-op`)
                });
            }
        }

        // 3. Supervisão
        if (role === "supervisao" || role === "direcao" || role === "admin") {
            const supPendentes = this.getDemandasSupervisao().filter(d => d.status === "pendente");
            supPendentes.forEach(d => {
                list.push({
                    id: `notif-sup-${d.id}`,
                    title: `📋 Nova Demanda Pedagógica`,
                    desc: `${d.titulo} - Urgência: ${d.prioridade.toUpperCase()}`,
                    time: `Prazo: ${d.prazo}`,
                    targetTab: "supervisao",
                    unread: !this.data.notificacoesLidas.includes(`notif-sup-${d.id}`)
                });
            });
        }

        // 4. Comunicados Gerais da Direção (Para todos)
        const avisosUrgentes = this.getMuralAvisos().filter(a => a.urgente);
        avisosUrgentes.forEach(a => {
            list.push({
                id: `notif-av-${a.id}`,
                title: `📢 Comunicado Urgente da Direção`,
                desc: a.titulo,
                time: a.data,
                targetTab: "mural",
                unread: !this.data.notificacoesLidas.includes(`notif-av-${a.id}`)
            });
        });

        // 5. Calendário de Prazos
        const tarefasHoje = this.getCalendarioTarefas().filter(t => t.quando === hojeStr && t.status !== "concluido");
        tarefasHoje.forEach(t => {
            list.push({
                id: `notif-cal-${t.id}`,
                title: `⏰ Prazo de Tarefa Hoje!`,
                desc: `${t.tarefa} (${t.responsavel})`,
                time: `Data: ${t.quando}`,
                targetTab: "mural",
                unread: !this.data.notificacoesLidas.includes(`notif-cal-${t.id}`)
            });
        });

        return list;
    }

    markAllNotificationsAsRead() {
        const notifs = this.getNotificacoesPertinentes();
        notifs.forEach(n => {
            if (!this.data.notificacoesLidas.includes(n.id)) {
                this.data.notificacoesLidas.push(n.id);
            }
        });
        this.saveData(this.data);
    }
}

// Instância Global
const sigeDB = new SigeDatabase();
