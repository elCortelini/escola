/**
 * gestao-data.js - Banco de Dados LocalStorage & Dados Iniciais para o SIGE
 * Centro Educacional Pedro Rizzi
 */


function getLocalDateISO(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function generateSecureId(prefix = '') {
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10));
    return prefix ? `${prefix}-${uuid}` : uuid;
}
if (typeof window !== 'undefined') {
    window.generateSecureId = generateSecureId;
}

const SIGE_STORAGE_KEY = "sige_pedro_rizzi_db_v2";

/**
 * Higieniza o nome do aluno removendo número sequencial de lista (ex: "4 ") 
 * e número de matrícula (ex: "20261000214") do início ou meio do nome.
 */
function cleanStudentName(nomeStr) {
    if (!nomeStr || typeof nomeStr !== "string") return "";
    let clean = nomeStr.trim();
    // 1. Remover numeração sequencial de lista e matrícula no início do nome antes da primeira letra
    clean = clean.replace(/^[\d\s\-\.\/]+(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, '');
    // 2. Remover matrícula solta de 7 a 14 dígitos que possa ter permanecido no texto
    clean = clean.replace(/\b\d{7,14}\b/g, '');
    // 3. Normalizar múltiplos espaços em branco
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
}
if (typeof window !== "undefined") {
    window.cleanStudentName = cleanStudentName;
}

// Estrutura Padrão Inicial
const defaultSigeData = {
    currentRole: "desenvolvedor", // desenvolvedor, direcao, orientadora_clarinda, orientadora_daiane, supervisao, secretaria, admin
    usuariosCadastrados: [
        { email: "elcortelini@gmail.com", nome: "Elevi Cortelini (Desenvolvedor)", role: "desenvolvedor", cargo: "Desenvolvedor do Sistema", permissoes: { op: true, mural: true, supervisao: true, admin: true, direcao: true, uniformes: true } },
        { email: "daiane.aquino04548@edu.itajai.sc.gov.br", nome: "Daiane Caetano Costa de Aquino", role: "orientadora_daiane", cargo: "Orientadora Educacional — Séries Finais", permissoes: { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false } },
        { email: "daiane@escola.gov.br", nome: "Daiane Caetano Costa de Aquino", role: "orientadora_daiane", cargo: "Orientadora Educacional — Séries Finais", permissoes: { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false } },
        { email: "clarinda@escola.gov.br", nome: "Clarinda Rosa Pereira", role: "orientadora_clarinda", cargo: "Orientadora Educacional — Séries Iniciais", permissoes: { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false } },
        { email: "secretaria@escola.gov.br", nome: "Secretaria Escolar", role: "secretaria", cargo: "Secretaria & Recepção", permissoes: { op: true, mural: true, supervisao: false, admin: true, direcao: false, uniformes: true } },
        { email: "direcao@escola.gov.br", nome: "Direção Escolar", role: "direcao", cargo: "Direção & Gestão Institucional", permissoes: { op: true, mural: true, supervisao: true, admin: true, direcao: true, uniformes: true } }
    ],
    pedidosUniformes: [
        {
            id: "uni-101",
            dataSolicitacao: "2026-09-12",
            aluno: "Enzo Gabriel Santos",
            turma: "1º Ano A",
            genero: "Masculino",
            motivo: "aluno_novo",
            motivoDesc: "Aluno Novo na Escola",
            tipoItem: "kit_completo",
            estacao: "verao",
            tamanho: "8",
            pecasAvulsas: [],
            observacoes: "Matrícula recente realizada na secretaria.",
            responsavelPedido: "secretaria",
            status: "enviado_sme",
            loteSmeId: "lote-sme-01",
            dataEnvioSme: "2026-09-15",
            previsaoRecebimentoSme: "2026-09-25",
            dataChegadaEscola: null,
            dataEntregaAluno: null,
            entreguePor: null,
            criadoEm: "2026-09-12T10:00:00"
        },
        {
            id: "uni-102",
            dataSolicitacao: "2026-09-14",
            aluno: "Isabella Rocha Lima",
            turma: "4º Ano B",
            genero: "Feminino",
            motivo: "troca_tamanho",
            motivoDesc: "Troca por tamanho maior",
            tipoItem: "avulso",
            estacao: "inverno",
            tamanho: "12",
            pecasAvulsas: ["moleton", "calca"],
            observacoes: "Calça antiga ficou curta.",
            responsavelPedido: "direcao",
            status: "pendente_envio",
            loteSmeId: null,
            dataEnvioSme: null,
            previsaoRecebimentoSme: null,
            dataChegadaEscola: null,
            dataEntregaAluno: null,
            entreguePor: null,
            criadoEm: "2026-09-14T14:20:00"
        },
        {
            id: "uni-103",
            dataSolicitacao: "2026-09-10",
            aluno: "Matheus Henrique Alves",
            turma: "7º Ano B",
            genero: "Masculino",
            motivo: "aluno_novo",
            motivoDesc: "Aluno Novo",
            tipoItem: "kit_completo",
            estacao: "inverno",
            tamanho: "14",
            pecasAvulsas: [],
            observacoes: "Transferência da rede municipal.",
            responsavelPedido: "orientacao",
            status: "disponivel_estoque",
            loteSmeId: "lote-sme-01",
            dataEnvioSme: "2026-09-15",
            previsaoRecebimentoSme: "2026-09-25",
            dataChegadaEscola: "2026-09-17",
            dataEntregaAluno: null,
            entreguePor: null,
            criadoEm: "2026-09-10T09:00:00"
        }
    ],
    lotesSME: [
        {
            id: "lote-sme-01",
            codigoLote: "REMESSA-2026-09-A",
            dataCorte: "2026-09-15",
            dataEnvioSme: "2026-09-15",
            previsaoRecebimento: "2026-09-25",
            dataChegadaReal: "2026-09-17",
            status: "recebido_parcial",
            observacoes: "Remessa enviada via Ofício nº 42/2026 para SME.",
            pedidosIds: ["uni-101", "uni-103"],
            responsavelFechamento: "Secretaria Escolar",
            criadoEm: "2026-09-15T16:00:00"
        }
    ],
    estoqueUniformes: {
        masculino: {
            "camiseta": { "8": 2, "10": 4, "12": 1, "14": 0, "16": 3, "P": 2, "M": 1, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "bermuda": { "8": 1, "10": 2, "12": 0, "14": 1, "16": 0, "P": 1, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "calca": { "8": 3, "10": 1, "12": 2, "14": 0, "16": 1, "P": 0, "M": 1, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "moleton": { "8": 0, "10": 2, "12": 1, "14": 0, "16": 0, "P": 1, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "jaqueta": { "8": 1, "10": 0, "12": 1, "14": 1, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
        },
        feminino: {
            "camiseta": { "8": 1, "10": 3, "12": 2, "14": 1, "16": 1, "P": 1, "M": 1, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "bermuda": { "8": 1, "10": 1, "12": 1, "14": 0, "16": 1, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "calca": { "8": 2, "10": 2, "12": 1, "14": 1, "16": 0, "P": 1, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "moleton": { "8": 1, "10": 1, "12": 0, "14": 0, "16": 1, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "jaqueta": { "8": 0, "10": 1, "12": 1, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
        }
    },
    agendamentosOP: [
        // Clarinda Rosa Pereira (Séries Iniciais: 1º ao 5º Anos) - 5 Atendimentos na Semana (07/09 a 11/09)
        {
            id: "op-201",
            aluno: "Sophia Maria Santos",
            turma: "3º Ano A",
            responsavel: "Mariana Santos (Mãe)",
            telefone: "47998877665",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-07",
            horario: "08:30",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Acompanhamento de adaptação escolar e integração com a turma.",
            statusSecretaria: "realizado",
            obsSecretaria: "Atendimento realizado com sucesso.",
            registradoPor: "Secretaria",
            criadoEm: "2026-09-06T10:00:00"
        },
        {
            id: "op-202",
            aluno: "Arthur Miguel Oliveira",
            turma: "4º Ano B",
            responsavel: "Ricardo Oliveira (Pai)",
            telefone: "47991234567",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-08",
            horario: "10:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Conversa com responsável referente ao rendimento em Leitura e Escrita.",
            statusSecretaria: "realizado",
            obsSecretaria: "Pai compareceu e foram traçadas metas de apoio em casa.",
            registradoPor: "Orientação",
            criadoEm: "2026-09-07T14:30:00"
        },
        {
            id: "op-203",
            aluno: "Helena Beatriz Costa",
            turma: "2º Ano C",
            responsavel: "Camila Costa (Mãe)",
            telefone: "47988332211",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-09",
            horario: "14:00",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Alinhamento pedagógico e suporte no acompanhamento das tarefas de casa.",
            statusSecretaria: "realizado",
            obsSecretaria: "Reunião pedagógica realizada.",
            registradoPor: "Orientação",
            criadoEm: "2026-09-08T09:15:00"
        },
        {
            id: "op-204",
            aluno: "Bernardo Silva Ramos",
            turma: "1º Ano A",
            responsavel: "Fernanda Ramos (Mãe)",
            telefone: "47997711223",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-10",
            horario: "09:15",
            turno: "matutino",
            tipo: "emergencial",
            motivo: "🚨 VAGA EMERGENCIAL: Aluno apresentou choro frequente e indisposição no início da aula.",
            statusSecretaria: "realizado",
            obsSecretaria: "Atendimento emergencial efetuado e mãe acionada.",
            registradoPor: "Profª Carmen",
            criadoEm: "2026-09-10T08:30:00"
        },
        {
            id: "op-205",
            aluno: "Alice Vitória Ferreira",
            turma: "5º Ano B",
            responsavel: "Patricia Ferreira (Mãe)",
            telefone: "47996655443",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-11",
            horario: "15:30",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Devolutiva sobre observação em sala de aula e combinados comportamentais.",
            statusSecretaria: "aguardando",
            obsSecretaria: "Responsável aguardando na recepção.",
            registradoPor: "Secretaria",
            criadoEm: "2026-09-10T16:00:00"
        },

        // Daiane Caetano Costa de Aquino (Séries Finais: 6º ao 9º Anos — Matutino) - 5 Atendimentos na Semana (07/09 a 11/09)
        {
            id: "op-206",
            aluno: "Gabriel Henrique Souza",
            turma: "7º Ano A",
            responsavel: "Ana Paula Souza (Mãe)",
            telefone: "47991122334",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-07",
            horario: "08:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Acompanhamento de frequência escolar e entregas de trabalhos do 3º trimestre.",
            statusSecretaria: "realizado",
            obsSecretaria: "Mãe alinhou prazos de entrega dos trabalhos faltantes.",
            registradoPor: "Secretaria",
            criadoEm: "2026-09-06T11:00:00"
        },
        {
            id: "op-207",
            aluno: "Lucas Eduardo Lima",
            turma: "8º Ano B",
            responsavel: "Roberto Lima (Pai)",
            telefone: "47992233445",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-08",
            horario: "09:30",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Mediação de conflito interpessoal ocorrido durante o recreio.",
            statusSecretaria: "realizado",
            obsSecretaria: "Mediação de conflito concluída com combinados de respeito mútuo.",
            registradoPor: "Orientação",
            criadoEm: "2026-09-07T15:00:00"
        },
        {
            id: "op-208",
            aluno: "Enzo Felipe Rocha",
            turma: "6º Ano C",
            responsavel: "Juliana Rocha (Mãe)",
            telefone: "47988334455",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-09",
            horario: "10:45",
            turno: "matutino",
            tipo: "emergencial",
            motivo: "🚨 VAGA EMERGENCIAL: Desentendimento em sala de aula necessitando intervenção imediata da OE.",
            statusSecretaria: "realizado",
            obsSecretaria: "Intervenção imediata realizada com os estudantes e aviso à família.",
            registradoPor: "Prof. Ricardo",
            criadoEm: "2026-09-09T10:15:00"
        },
        {
            id: "op-209",
            aluno: "Julia Maria Martins",
            turma: "9º Ano A",
            responsavel: "Marcos Martins (Pai)",
            telefone: "47994455667",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-10",
            horario: "08:30",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Orientação vocacional e encaminhamentos pedagógicos para transição ao Ensino Médio.",
            statusSecretaria: "realizado",
            obsSecretaria: "Atendimento realizado com estudante e pai.",
            registradoPor: "Orientação",
            criadoEm: "2026-09-09T16:30:00"
        },
        {
            id: "op-210",
            aluno: "Nicolas Alexander Barbosa",
            turma: "7º Ano B",
            responsavel: "Simone Barbosa (Mãe)",
            telefone: "47995566778",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-11",
            horario: "10:15",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Reunião de acompanhamento pedagógico e avaliação do plano de ação individual.",
            statusSecretaria: "aguardando",
            obsSecretaria: "Mãe aguarda na recepção.",
            registradoPor: "Secretaria",
            criadoEm: "2026-09-10T17:00:00"
        },

        // ----------------------------------------------------
        // AGENDAMENTOS DE TESTE NA SEMANA (14/09/2026 a 18/09/2026) - 20 Atendimentos (10 Clarinda + 10 Daiane)
        // ----------------------------------------------------
        // CLARINDA ROSA PEREIRA (Séries Iniciais: 1º ao 5º Ano)
        {
            id: "op-test-301",
            aluno: "Lucas Gabriel Ramos",
            turma: "3º Ano B",
            responsavel: "Juliana Ramos (Mãe)",
            telefone: "47998811223",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-14",
            horario: "08:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Acompanhamento de adaptação e rendimento em Leitura.",
            statusSecretaria: "realizado",
            obsSecretaria: "Atendimento realizado com a mãe.",
            registradoPor: "Clarinda Rosa Pereira",
            criadoEm: "2026-09-11T10:00:00"
        },
        {
            id: "op-test-302",
            aluno: "Isadora Lima Mendes",
            turma: "1º Ano B",
            responsavel: "Marcos Mendes (Pai)",
            telefone: "47997722334",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-14",
            horario: "13:30",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Alinhamento sobre comportamento e integração na turma.",
            statusSecretaria: "realizado",
            obsSecretaria: "Pai compareceu e definiu acordos de apoio.",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-11T14:20:00"
        },
        {
            id: "op-test-303",
            aluno: "Mateus Henrique Silveira",
            turma: "4º Ano A",
            responsavel: "Carla Silveira (Mãe)",
            telefone: "47996633445",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-15",
            horario: "09:15",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Reunião pedagógica sobre apoio nas atividades de Matemática.",
            statusSecretaria: "aguardando",
            obsSecretaria: "Mãe aguardando atendimento na recepção.",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-12T09:00:00"
        },
        {
            id: "op-test-304",
            aluno: "Heloísa Castro Rocha",
            turma: "5º Ano A",
            responsavel: "Renata Rocha (Mãe)",
            telefone: "47995544556",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-15",
            horario: "14:45",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Orientação sobre organização de estudos e transição para o 6º ano.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Clarinda Rosa Pereira",
            criadoEm: "2026-09-12T11:30:00"
        },
        {
            id: "op-test-305",
            aluno: "Pedro Henrique Alves",
            turma: "2º Ano A",
            responsavel: "Tiago Alves (Pai)",
            telefone: "47994455667",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-16",
            horario: "08:30",
            turno: "matutino",
            tipo: "emergencial",
            motivo: "🚨 Atendimento emergencial: indisposição física e choro.",
            statusSecretaria: "realizado",
            obsSecretaria: "Pai veio retirar o aluno.",
            registradoPor: "Profª Carmen",
            criadoEm: "2026-09-16T08:15:00"
        },
        {
            id: "op-test-306",
            aluno: "Manuela Barbosa Farias",
            turma: "3º Ano C",
            responsavel: "Vanessa Farias (Mãe)",
            telefone: "47993366778",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-16",
            horario: "15:30",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Devolutiva do acompanhamento de frequência e pontualidade.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-13T10:00:00"
        },
        {
            id: "op-test-307",
            aluno: "Enzo Gabriel Martins",
            turma: "4º Ano B",
            responsavel: "Luciana Martins (Mãe)",
            telefone: "47992277889",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-17",
            horario: "10:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Conversa com responsável sobre tarefas extraclasse.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Clarinda Rosa Pereira",
            criadoEm: "2026-09-14T08:00:00"
        },
        {
            id: "op-test-308",
            aluno: "Valentina Soares Pires",
            turma: "1º Ano A",
            responsavel: "Eduardo Pires (Pai)",
            telefone: "47991188990",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-17",
            horario: "14:00",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Acompanhamento do desenvolvimento socioemocional.",
            statusSecretaria: "ausente",
            obsSecretaria: "Pai justificou ausência por motivo de trabalho.",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-14T11:00:00"
        },
        {
            id: "op-test-309",
            aluno: "Benjamin Correa Nogueira",
            turma: "5º Ano C",
            responsavel: "Simone Nogueira (Mãe)",
            telefone: "47990099001",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-18",
            horario: "09:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Avaliação do plano de apoio pedagógico individualizado.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Clarinda Rosa Pereira",
            criadoEm: "2026-09-14T15:30:00"
        },
        {
            id: "op-test-310",
            aluno: "Lorena Dias Cardoso",
            turma: "2º Ano B",
            responsavel: "Fabiana Cardoso (Mãe)",
            telefone: "47989900112",
            orientadora: "Clarinda Rosa Pereira",
            data: "2026-09-18",
            horario: "15:00",
            turno: "vespertino",
            tipo: "agendado",
            motivo: "Alinhamento com família sobre rotina de estudos em casa.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-15T08:00:00"
        },

        // DAIANE CAETANO COSTA DE AQUINO (Séries Finais: 6º ao 9º Ano)
        {
            id: "op-test-311",
            aluno: "Vinícius Augusto Lima",
            turma: "7º Ano B",
            responsavel: "Claudia Lima (Mãe)",
            telefone: "47988113344",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-14",
            horario: "08:30",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Acompanhamento do rendimento escolar no 3º trimestre.",
            statusSecretaria: "realizado",
            obsSecretaria: "Reunião concluída com alinhamento de plano de estudo.",
            registradoPor: "Daiane Caetano Costa de Aquino",
            criadoEm: "2026-09-11T09:00:00"
        },
        {
            id: "op-test-312",
            aluno: "Beatriz Helena Machado",
            turma: "8º Ano A",
            responsavel: "Marcio Machado (Pai)",
            telefone: "47987224455",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-14",
            horario: "10:15",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Mediação de convivência e combinados de grupo em sala.",
            statusSecretaria: "realizado",
            obsSecretaria: "Pai alinhou combinados com a aluna.",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-11T11:15:00"
        },
        {
            id: "op-test-313",
            aluno: "Caio Eduardo Camargo",
            turma: "6º Ano A",
            responsavel: "Helena Camargo (Mãe)",
            telefone: "47986335566",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-15",
            horario: "08:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Orientação sobre rotina de estudos e uso do material didático.",
            statusSecretaria: "aguardando",
            obsSecretaria: "Responsável aguardando na recepção.",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-12T08:30:00"
        },
        {
            id: "op-test-314",
            aluno: "Lara Sophia Freitas",
            turma: "9º Ano B",
            responsavel: "Adriana Freitas (Mãe)",
            telefone: "47985446677",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-15",
            horario: "10:45",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Conversa sobre orientação vocacional e transição para Ensino Médio.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Daiane Caetano Costa de Aquino",
            criadoEm: "2026-09-12T10:00:00"
        },
        {
            id: "op-test-315",
            aluno: "Thiago Henrique Ribeiro",
            turma: "7º Ano C",
            responsavel: "Fernando Ribeiro (Pai)",
            telefone: "47984557788",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-16",
            horario: "09:00",
            turno: "matutino",
            tipo: "emergencial",
            motivo: "🚨 Vaga emergencial: desentendimento em quadra e conversa com a coordenação.",
            statusSecretaria: "realizado",
            obsSecretaria: "Atendimento emergencial efetuado.",
            registradoPor: "Profº Luciana",
            criadoEm: "2026-09-16T08:50:00"
        },
        {
            id: "op-test-316",
            aluno: "Yasmin Vitória Moreira",
            turma: "6º Ano B",
            responsavel: "Carla Moreira (Mãe)",
            telefone: "47983668899",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-16",
            horario: "11:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Acompanhamento pedagógico de notas e trabalhos pendentes.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-13T14:00:00"
        },
        {
            id: "op-test-317",
            aluno: "Rodrigo Felipe Duarte",
            turma: "8º Ano C",
            responsavel: "Elisabete Duarte (Mãe)",
            telefone: "47982779900",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-17",
            horario: "08:15",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Alinhamento de apoio ao aprendizado em Língua Portuguesa.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Daiane Caetano Costa de Aquino",
            criadoEm: "2026-09-14T09:30:00"
        },
        {
            id: "op-test-318",
            aluno: "Melissa Aparecida Vieira",
            turma: "9º Ano A",
            responsavel: "Sandro Vieira (Pai)",
            telefone: "47981880011",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-17",
            horario: "10:30",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Devolutiva sobre simulado e frequência escolar.",
            statusSecretaria: "ausente",
            obsSecretaria: "Pai solicitou remarcação por motivo de consulta médica.",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-14T11:45:00"
        },
        {
            id: "op-test-319",
            aluno: "Samuel Davi Xavier",
            turma: "7º Ano A",
            responsavel: "Tatiane Xavier (Mãe)",
            telefone: "47980991122",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-18",
            horario: "08:45",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Orientação sobre hábitos de estudo e uso de tecnologia.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Daiane Caetano Costa de Aquino",
            criadoEm: "2026-09-14T16:00:00"
        },
        {
            id: "op-test-320",
            aluno: "Clara Luíza Teixeira",
            turma: "6º Ano D",
            responsavel: "Paulo Teixeira (Pai)",
            telefone: "47979002233",
            orientadora: "Daiane Caetano Costa de Aquino",
            data: "2026-09-18",
            horario: "10:00",
            turno: "matutino",
            tipo: "agendado",
            motivo: "Conversa com responsável referente a rendimento e combinados.",
            statusSecretaria: "agendado",
            obsSecretaria: "",
            registradoPor: "Secretaria Escolar",
            criadoEm: "2026-09-15T08:15:00"
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
            orientadoraLider: "Clarinda Rosa Pereira",
            envolvidos: "Professores de Educação Física, Psicopedagoga, Direção Escolar",
            status: "em_dia",
            etapas: [
                { id: "e-op-1", titulo: "Rodas de conversa sobre convivência nas turmas do 7º ano", dataLimite: "2026-09-18", responsavel: "Orientadora Clarinda", concluido: true },
                { id: "e-op-2", titulo: "Mapeamento de alunos líderes mediadores de cada turma", dataLimite: "2026-09-28", responsavel: "Orientadora Daiane", concluido: false },
                { id: "e-op-3", titulo: "Oficina prática com os pais sobre escuta não-violenta em casa", dataLimite: "2026-10-20", responsavel: "Orientadora Clarinda", concluido: false }
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
            orientadoraLider: "Daiane Caetano Costa de Aquino",
            envolvidos: "Secretaria Escolar, Conselho Tutelar, Regentes de Turma",
            status: "atencao",
            etapas: [
                { id: "e-op-21", titulo: "Levantamento das listas de faltas quinzenais com a Secretaria", dataLimite: "2026-09-12", responsavel: "Secretaria / Daiane", concluido: true },
                { id: "e-op-22", titulo: "Convocação individual dos pais de 12 alunos com frequência crítica", dataLimite: "2026-09-20", responsavel: "Orientadora Daiane", concluido: false },
                { id: "e-op-23", titulo: "Notificação oficial enviada à Rede de Proteção / Conselho", dataLimite: "2026-10-05", responsavel: "Orientadora Daiane", concluido: false }
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
            nome: "Clarinda Rosa Pereira",
            telefone: "47999112233",
            email: "clarinda@escola.gov.br"
        },
        {
            id: "orient-2",
            nome: "Daiane Caetano Costa de Aquino",
            telefone: "47999445566",
            email: "daiane@escola.gov.br"
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
            nome: "Clarinda Rosa Pereira",
            setor: "orientacao",
            cargoFuncao: "Orientadora Educacional — Séries Iniciais",
            disciplina: "Orientação Educacional (OE)",
            telefone: "47999112233",
            email: "clarinda@escola.gov.br",
            turnos: "matutino,vespertino",
            turmasOuSalas: "1º ao 5º Anos (Séries Iniciais)"
        },
        {
            id: "orient-2",
            nome: "Daiane Caetano Costa de Aquino",
            setor: "orientacao",
            cargoFuncao: "Orientadora Educacional — Séries Finais",
            disciplina: "Orientação Educacional (OE)",
            telefone: "47999445566",
            email: "daiane@escola.gov.br",
            turnos: "matutino",
            turmasOuSalas: "6º ao 9º Anos (Séries Finais)"
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

    atasGabineteDirecao: [
        {
            id: "ata-dir-1",
            data: "2026-09-18T10:30:00",
            titulo: "Atendimento aos Responsáveis — Aluno Lucas Gabriel",
            tipo: "pais",
            tipoDesc: "Atendimento a Pais / Responsáveis",
            participantes: "Direção Escolar, Responsável (Sra. Mariana), Orientadora Clarinda",
            alunoRelacionado: "Lucas Gabriel",
            turmaRelacionada: "3º Ano A",
            pauta: "Acompanhamento da frequência escolar e combinados sobre apoio pedagógico no contraturno.",
            combinados: "Responsável se comprometeu a garantir pontualidade e justificar eventuais atestados médicos em até 48h. Acompanhamento semanal pela OE.",
            encaminhamentos: "Orientadora Clarinda acompanhará relatório semanal de presença.",
            autor: "Direção Escolar",
            status: "concluida"
        },
        {
            id: "ata-dir-2",
            data: "2026-09-15T14:00:00",
            titulo: "Reunião de Alinhamento com o Conselho Tutelar",
            tipo: "conselho_tutelar",
            tipoDesc: "Órgãos Externos / Conselho Tutelar",
            participantes: "Direção, Conselheiro Carlos Mendes, Equipe Multidisciplinar",
            alunoRelacionado: "",
            turmaRelacionada: "",
            pauta: "Avaliação do fluxo de encaminhamentos do programa APOIA e acompanhamento das famílias em vulnerabilidade.",
            combinados: "Definida reunião mensal de retorno na última quinta-feira de cada mês.",
            encaminhamentos: "Secretaria enviará relação atualizada de infrequência quinzenal.",
            autor: "Direção Escolar",
            status: "concluida"
        }
    ],

    eventosCalendarioEscolar: [
        {
            id: "cal-ev-1",
            data: "2026-10-08",
            hora: "08:00",
            titulo: "Reunião Pedagógica Geral com o Corpo Docente",
            categoria: "reuniao_pedagogica",
            categoriaDesc: "Reunião Pedagógica",
            descricao: "Alinhamento das metas do 3º trimestre, diretrizes avaliativas e planejamento interdisciplinar.",
            publicoAlvo: "professores",
            local: "Auditório da Escola",
            status: "agendado"
        },
        {
            id: "cal-ev-2",
            data: "2026-10-12",
            hora: "00:00",
            titulo: "Feriado Nacional — Dia das Crianças / N. Sra. Aparecida",
            categoria: "feriado_recesso",
            categoriaDesc: "Feriado / Recesso",
            descricao: "Não haverá expediente letivo nem administrativo.",
            publicoAlvo: "escola_toda",
            local: "Escola",
            status: "agendado"
        },
        {
            id: "cal-ev-3",
            data: "2026-10-24",
            hora: "09:00",
            titulo: "Mostra Cultural & Científica Pedro Rizzi",
            categoria: "evento_cultural",
            categoriaDesc: "Evento Cultural / Feira",
            descricao: "Apresentação dos projetos dos alunos do 1º ao 9º Ano para toda a comunidade escolar e famílias.",
            publicoAlvo: "escola_toda",
            local: "Pátio e Ginásio Escolar",
            status: "agendado"
        },
        {
            id: "cal-ev-4",
            data: "2026-11-20",
            hora: "17:00",
            titulo: "Data-Limite: Fechamento de Notas e Faltas (3º Trimestre)",
            categoria: "prazo_notas",
            categoriaDesc: "Prazo de Notas e Diários",
            descricao: "Prazo improrrogável para lançamento de notas e pareceres pelos professores no sistema.",
            publicoAlvo: "professores",
            local: "Sistema Online",
            status: "agendado"
        },
        {
            id: "cal-ev-5",
            data: "2026-11-25",
            hora: "08:00",
            titulo: "Conselho de Classe Final e Pré-Deliberação",
            categoria: "conselho_classe",
            categoriaDesc: "Conselho de Classe",
            descricao: "Avaliação final das turmas, análise de progressão continuada e recuperação final.",
            publicoAlvo: "professores",
            local: "Sala de Reuniões",
            status: "agendado"
        }
    ],

    contatosWhatsAppDirecao: [
        {
            id: "w-cont-1",
            nome: "Sra. Mariana (Mãe Lucas Gabriel)",
            telefone: "47999881122",
            tags: ["Pais / Responsáveis", "3º Ano A", "Conselho de Classe"],
            tag: "Pais / Responsáveis, 3º Ano A",
            notas: "Responsável comparece às convocações, prefere contato à tarde."
        },
        {
            id: "w-cont-2",
            nome: "Conselho Tutelar Polo Fazenda",
            telefone: "4733445566",
            tags: ["Conselho Tutelar / SME", "Órgãos Externos"],
            tag: "Conselho Tutelar / SME",
            notas: "Plantão do Conselho Tutelar para encaminhamentos APOIA."
        },
        {
            id: "w-cont-3",
            nome: "Presidência da APMF - Pedro Rizzi",
            telefone: "47991223344",
            tags: ["Conselho Escolar / APMF", "Financeiro"],
            tag: "Conselho Escolar / APMF",
            notas: "Contato oficial da diretoria da Associação de Pais e Mestres."
        },
        {
            id: "w-cont-4",
            nome: "Prof. Ricardo - Representante Docente",
            telefone: "47997665544",
            tags: ["Equipe Docente", "Anos Finais", "Matemática"],
            tag: "Equipe Docente",
            notas: "Comunicação rápida sobre pautas dos professores dos Anos Finais."
        },
        {
            id: "w-cont-5",
            nome: "Sr. Carlos (Pai de Isabella Rocha)",
            telefone: "47988776655",
            tags: ["Pais / Responsáveis", "4º Ano B"],
            tag: "Pais / Responsáveis, 4º Ano B",
            notas: "Pai da aluna Isabella Rocha."
        },
        {
            id: "w-cont-6",
            nome: "Sra. Juliana (Mãe de Enzo Gabriel)",
            telefone: "47992334455",
            tags: ["Pais / Responsáveis", "1º Ano A", "Alunos Novos"],
            tag: "Pais / Responsáveis, 1º Ano A",
            notas: "Mãe do aluno novo matriculado recentemente."
        }
    ],

    mensagensWhatsAppLog: [
        {
            id: "w-log-1",
            contatoNome: "Sra. Mariana (Mãe Lucas Gabriel)",
            telefone: "47999881122",
            tag: "Pais / Responsáveis",
            mensagem: "Olá, aqui é da Direção do C.E. Pedro Rizzi. Confirmamos a reunião de acompanhamento agendada.",
            enviadoEm: "2026-09-18T09:00:00",
            status: "confirmado"
        }
    ],

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
        this.data = this.loadLocalOnly();
        this.fbApp = null;
        this.firestore = null;
        this.isSyncingFromRemote = false;
        this.hasLoadedRemote = false;
        this.sanitizeStudentNames();
        this.initFirebase();
        this.setupAutoSyncListeners();
    }

    sanitizeStudentNames() {
        if (!this.data) return;
        let changed = false;

        if (Array.isArray(this.data.alunosImportados)) {
            this.data.alunosImportados.forEach(a => {
                if (a.nome) {
                    const cleaned = cleanStudentName(a.nome);
                    if (cleaned !== a.nome) {
                        a.nome = cleaned;
                        changed = true;
                    }
                }
            });
        }

        if (Array.isArray(this.data.agendamentosOP)) {
            this.data.agendamentosOP.forEach(a => {
                if (a.aluno) {
                    const cleaned = cleanStudentName(a.aluno);
                    if (cleaned !== a.aluno) {
                        a.aluno = cleaned;
                        changed = true;
                    }
                }
            });
        }

        if (changed) {
            this.saveData(this.data);
        }
    }

    getFirebaseConfig() {
        if (!this.data.firebaseConfig || !this.data.firebaseConfig.projectId) {
            this.data.firebaseConfig = defaultSigeData.firebaseConfig;
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

            // Real-Time Cloud Listener (Snapshot da Nuvem)
            this.firestore.collection("sige_pedro_rizzi").doc("database").onSnapshot((doc) => {
                if (doc.exists) {
                    const remoteData = doc.data();
                    if (remoteData && typeof remoteData === "object" && Object.keys(remoteData).length > 0) {
                        this.isSyncingFromRemote = true;

                        const localDeletedOPIds = this.data?.deletedOPIds || [];
                        const remoteDeletedOPIds = remoteData.deletedOPIds || [];
                        const combinedDeletedIds = Array.from(new Set([...localDeletedOPIds, ...remoteDeletedOPIds]));

                        this.data = { ...defaultSigeData, ...this.data, ...remoteData };
                        this.data.deletedOPIds = combinedDeletedIds;

                        if (Array.isArray(this.data.agendamentosOP) && combinedDeletedIds.length > 0) {
                            const delSet = new Set(combinedDeletedIds);
                            this.data.agendamentosOP = this.data.agendamentosOP.filter(a => !delSet.has(a.id));
                        }

                        this.sanitizeStudentNames();

                        localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(this.data));
                        this.isSyncingFromRemote = false;
                        this.hasLoadedRemote = true;

                        console.log("☁️ Dados sincronizados da Nuvem (Firebase) em tempo real!");
                        this.updateCloudSyncBadge(true);

                        if (typeof updateAllDynamicSelects === "function") {
                            updateAllDynamicSelects();
                        }
                        if (typeof renderAllModules === "function") {
                            renderAllModules();
                        } else if (typeof renderModuleAdministracao === "function") {
                            renderModuleAdministracao();
                        }
                    }
                } else {
                    this.hasLoadedRemote = true;
                    this.syncToFirebase();
                }
            }, (error) => {
                console.warn("Aviso Firebase Firestore Sync:", error.message);
                this.updateCloudSyncBadge(false);
            });

            console.log("🔥 Firebase Firestore inicializado e sincronizando com a nuvem!");
        } catch (e) {
            console.error("Erro ao inicializar Firebase:", e);
        }
    }

    syncToFirebase() {
        if (!this.hasLoadedRemote || this.isSyncingFromRemote || !this.firestore || !this.data.firebaseConfig || !this.data.firebaseConfig.projectId) {
            return;
        }

        try {
            this.firestore.collection("sige_pedro_rizzi").doc("database").set(this.data, { merge: true })
                .then(() => {
                    console.log("💾 Dados sincronizados com sucesso para a Nuvem!");
                    this.updateCloudSyncBadge(true);
                })
                .catch(err => {
                    console.warn("Erro ao sincronizar com Firebase:", err.message);
                    this.updateCloudSyncBadge(false);
                });
        } catch (e) {
            console.warn("Exceção ao enviar para Firebase:", e);
        }
    }

    forceFetchRemoteData() {
        if (!this.firestore) {
            if (typeof showToast === "function") showToast("⚠️ Conexão com a Nuvem não disponível.");
            return;
        }

        this.updateCloudSyncBadge(null, "Buscando dados na nuvem...");

        this.firestore.collection("sige_pedro_rizzi").doc("database").get()
            .then(doc => {
                if (doc.exists) {
                    const remoteData = doc.data();
                    if (remoteData && typeof remoteData === "object") {
                        this.isSyncingFromRemote = true;
                        this.data = { ...defaultSigeData, ...this.data, ...remoteData };
                        this.sanitizeStudentNames();
                        localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(this.data));
                        this.isSyncingFromRemote = false;
                        this.hasLoadedRemote = true;

                        if (typeof updateAllDynamicSelects === "function") updateAllDynamicSelects();
                        if (typeof renderAllModules === "function") renderAllModules();

                        if (typeof showToast === "function") showToast("☁️ Dados sincronizados com sucesso da Nuvem!");
                        this.updateCloudSyncBadge(true);
                    }
                }
            })
            .catch(err => {
                console.error("Erro ao buscar dados na nuvem:", err);
                if (typeof showToast === "function") showToast("❌ Falha ao buscar dados na nuvem.");
                this.updateCloudSyncBadge(false);
            });
    }

    setupAutoSyncListeners() {
        if (typeof window === "undefined") return;

        window.addEventListener("focus", () => {
            if (this.firestore && this.hasLoadedRemote) {
                this.forceFetchRemoteData();
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden && this.firestore && this.hasLoadedRemote) {
                this.forceFetchRemoteData();
            }
        });
    }

    updateCloudSyncBadge(isSuccess, customMessage = "") {
        const btnText = document.getElementById("cloudSyncBtnText");
        if (!btnText) return;

        if (customMessage) {
            btnText.innerText = customMessage;
            return;
        }

        if (isSuccess) {
            btnText.innerText = "Nuvem Conectada (Tempo Real)";
        } else {
            btnText.innerText = "Modo Off-line";
        }
    }

    loadLocalOnly() {
        const stored = localStorage.getItem(SIGE_STORAGE_KEY);
        if (!stored) {
            return defaultSigeData;
        }
        try {
            const parsed = JSON.parse(stored);
            const merged = {
                ...defaultSigeData,
                ...parsed,
                atasGabineteDirecao: parsed.atasGabineteDirecao || defaultSigeData.atasGabineteDirecao,
                eventosCalendarioEscolar: parsed.eventosCalendarioEscolar || defaultSigeData.eventosCalendarioEscolar,
                contatosWhatsAppDirecao: parsed.contatosWhatsAppDirecao || defaultSigeData.contatosWhatsAppDirecao,
                mensagensWhatsAppLog: parsed.mensagensWhatsAppLog || defaultSigeData.mensagensWhatsAppLog
            };
            if (Array.isArray(merged.usuariosCadastrados)) {
                merged.usuariosCadastrados = merged.usuariosCadastrados.map(u => {
                    const defaultUser = defaultSigeData.usuariosCadastrados.find(du => du.email === u.email);
                    return {
                        ...u,
                        permissoes: u.permissoes || (defaultUser ? defaultUser.permissoes : { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false })
                    };
                });
            }
            return merged;
        } catch (e) {
            console.error("Erro ao carregar banco de dados local do SIGE:", e);
            return defaultSigeData;
        }
    }

    load() {
        return this.loadLocalOnly();
    }

    saveData(data) {
        this.data = data;
        try {
            localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.error('⚠️ Limite de armazenamento local atingido. Dados não salvos localmente.', e);
                if (typeof showToast === 'function') {
                    showToast('⚠️ Armazenamento local cheio. Dados salvos apenas na nuvem.', 'warning');
                }
            } else {
                console.error('Erro ao salvar localmente:', e);
            }
        }
        this.syncToFirebase();
    }

    resetToDefault() {
        this.saveData(defaultSigeData);
        window.location.reload();
    }

    // Gerenciador de Usuários e Login por E-mail
    getUsuarios() {
        if (!this.data.usuariosCadastrados || !Array.isArray(this.data.usuariosCadastrados) || this.data.usuariosCadastrados.length === 0) {
            this.data.usuariosCadastrados = [
                { email: "elcortelini@gmail.com", nome: "Elevi Cortelini (Desenvolvedor)", role: "desenvolvedor", cargo: "Desenvolvedor do Sistema" },
                { email: "daiane.aquino04548@edu.itajai.sc.gov.br", nome: "Daiane Caetano Costa de Aquino", role: "orientadora_daiane", cargo: "Orientadora Educacional — Séries Finais" },
                { email: "daiane@escola.gov.br", nome: "Daiane Caetano Costa de Aquino", role: "orientadora_daiane", cargo: "Orientadora Educacional — Séries Finais" },
                { email: "clarinda@escola.gov.br", nome: "Clarinda Rosa Pereira", role: "orientadora_clarinda", cargo: "Orientadora Educacional — Séries Iniciais" },
                { email: "secretaria@escola.gov.br", nome: "Secretaria Escolar", role: "secretaria", cargo: "Secretaria & Recepção" },
                { email: "direcao@escola.gov.br", nome: "Direção Escolar", role: "direcao", cargo: "Direção & Gestão Institucional" }
            ];
            this.saveData(this.data);
        } else {
            const hasDaianeOfficial = this.data.usuariosCadastrados.some(u => u.email.toLowerCase().includes("daiane.aquino04548"));
            if (!hasDaianeOfficial) {
                this.data.usuariosCadastrados.push({ 
                    email: "daiane.aquino04548@edu.itajai.sc.gov.br", 
                    nome: "Daiane Caetano Costa de Aquino", 
                    role: "orientadora_daiane", 
                    cargo: "Orientadora Educacional — Séries Finais" 
                });
                this.saveData(this.data);
            }
        }
        return this.data.usuariosCadastrados;
    }

    addUsuario(user) {
        const list = this.getUsuarios();
        const existingIndex = list.findIndex(u => u.email.toLowerCase().trim() === user.email.toLowerCase().trim());
        if (existingIndex >= 0) {
            list[existingIndex] = user;
        } else {
            list.push(user);
        }
        this.data.usuariosCadastrados = list;
        this.saveData(this.data);
        return user;
    }

    removeUsuario(email) {
        if (email.toLowerCase().trim() === "elcortelini@gmail.com") return false;
        let list = this.getUsuarios();
        list = list.filter(u => u.email.toLowerCase().trim() !== email.toLowerCase().trim());
        this.data.usuariosCadastrados = list;
        this.saveData(this.data);
        return true;
    }

    getLoggedUser() {
        const loggedEmail = localStorage.getItem("sige_logged_email");
        if (!loggedEmail) return null;
        const users = this.getUsuarios();
        const found = users.find(u => u.email.toLowerCase().trim() === loggedEmail.toLowerCase().trim());
        if (found) return found;
        if (loggedEmail.toLowerCase().trim() === "elcortelini@gmail.com") {
            return { email: "elcortelini@gmail.com", nome: "Elevi Cortelini (Desenvolvedor)", role: "desenvolvedor", cargo: "Desenvolvedor do Sistema" };
        }
        return null;
    }

    loginWithEmail(email) {
        if (!email) return null;
        const cleanEmail = email.toLowerCase().trim();
        const users = this.getUsuarios();
        let user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);

        if (!user) {
            if (cleanEmail === "daiane.aquino04548@edu.itajai.sc.gov.br" || cleanEmail === "daiane@escola.gov.br") {
                user = { 
                    email: cleanEmail, 
                    nome: "Daiane Caetano Costa de Aquino", 
                    role: "orientadora_daiane", 
                    cargo: "Orientadora Educacional — Séries Finais" 
                };
                this.addUsuario(user);
            } else if (cleanEmail === "clarinda@escola.gov.br") {
                user = { 
                    email: cleanEmail, 
                    nome: "Clarinda Rosa Pereira", 
                    role: "orientadora_clarinda", 
                    cargo: "Orientadora Educacional — Séries Iniciais" 
                };
                this.addUsuario(user);
            } else if (cleanEmail === "elcortelini@gmail.com") {
                user = { 
                    email: "elcortelini@gmail.com", 
                    nome: "Elevi Cortelini (Desenvolvedor)", 
                    role: "desenvolvedor", 
                    cargo: "Desenvolvedor do Sistema" 
                };
                this.addUsuario(user);
            }
        }

        if (user) {
            localStorage.setItem("sige_logged_email", user.email);
            this.setRole(user.role);
            return user;
        }
        return null;
    }

    logout() {
        localStorage.removeItem("sige_logged_email");
    }

    // Gerenciador de Alunos e Turmas Importados via PDF
    getAlunosImportados() {
        if (!this.data.alunosImportados || !Array.isArray(this.data.alunosImportados)) {
            this.data.alunosImportados = [];
        }
        return this.data.alunosImportados;
    }

    clearAlunosImportados() {
        if (!this.data) this.data = {};
        this.data.alunosImportados = [];
        this.data.pdfImportMeta = null;
        this.saveData(this.data);
    }

    getLastPdfImportMeta() {
        return this.data.pdfImportMeta || null;
    }

    saveAlunosImportados(novosAlunos, metaInfo) {
        let list = this.getAlunosImportados();
        const mapByMatricula = new Map();

        list.forEach(a => {
            if (a.nome) a.nome = cleanStudentName(a.nome);
            if (a.matricula) mapByMatricula.set(a.matricula, a);
        });

        novosAlunos.forEach(novo => {
            if (novo.nome) novo.nome = cleanStudentName(novo.nome);
            if (novo.matricula && mapByMatricula.has(novo.matricula)) {
                const ext = mapByMatricula.get(novo.matricula);
                ext.nome = novo.nome;
                ext.turma = novo.turma;
                ext.turno = novo.turno;
                ext.email = novo.email;
                ext.dataNasc = novo.dataNasc;
                const combinedPhones = Array.from(new Set([...(ext.telefones || []), ...(novo.telefones || [])]));
                ext.telefones = combinedPhones;
            } else {
                if (novo.matricula) mapByMatricula.set(novo.matricula, novo);
                list.push(novo);
            }
        });

        this.data.alunosImportados = list;
        this.data.pdfImportMeta = metaInfo;
        this.sanitizeStudentNames();
        this.syncTurmasFromImportedAlunos();
        this.saveData(this.data);
    }

    syncTurmasFromImportedAlunos() {
        const alunos = this.getAlunosImportados();
        if (!alunos || alunos.length === 0) return;

        if (!this.data.turmasEscola || !Array.isArray(this.data.turmasEscola)) {
            this.data.turmasEscola = [];
        }

        const turmasMap = new Map();
        this.data.turmasEscola.forEach(t => {
            const cleanName = (t.nome || "").trim();
            if (cleanName) turmasMap.set(cleanName.toLowerCase(), t);
        });

        let updated = false;

        alunos.forEach(aluno => {
            const code = (aluno.turma || "").trim();
            if (!code) return;
            const codeLower = code.toLowerCase();

            if (!turmasMap.has(codeLower)) {
                const turnoLower = (aluno.turno || "matutino").toLowerCase();
                const firstDigit = code.charAt(0);
                let nivel = "Ensino Fundamental I";
                if (["6", "7", "8", "9"].includes(firstDigit)) {
                    nivel = "Ensino Fundamental II";
                } else if (["1", "2", "3", "4", "5"].includes(firstDigit)) {
                    nivel = "Ensino Fundamental I";
                }

                const newTurma = {
                    id: "turma-pdf-" + code.replace(/[^\w]/g, ""),
                    nome: code,
                    turno: turnoLower,
                    anoLetivo: "2026",
                    nivel: nivel,
                    sala: "Sala Geral",
                    capacidade: 35,
                    regente: "Não definido"
                };

                this.data.turmasEscola.push(newTurma);
                turmasMap.set(codeLower, newTurma);
                updated = true;
            }
        });

        if (updated) {
            this.data.turmasEscola.sort((a, b) => {
                const numA = parseInt(a.nome.replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(b.nome.replace(/\D/g, ''), 10) || 0;
                if (numA !== numB) return numA - numB;
                return a.nome.localeCompare(b.nome);
            });
            this.saveData(this.data);
        }
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
        const all = (this.data && this.data.agendamentosOP) ? this.data.agendamentosOP : [];
        const role = this.getRole();
        if (role === 'orientadora_clarinda') {
            return all.filter(a => !a.orientadora || a.orientadora.toLowerCase().includes('clarinda'));
        }
        if (role === 'orientadora_daiane') {
            return all.filter(a => !a.orientadora || a.orientadora.toLowerCase().includes('daiane') || a.orientadora.toLowerCase().includes('aquino'));
        }
        return all;
    }

    deleteAgendamentoOP(id) {
        if (!id) return false;
        if (!this.data) this.data = {};
        if (!Array.isArray(this.data.deletedOPIds)) {
            this.data.deletedOPIds = [];
        }
        if (!this.data.deletedOPIds.includes(id)) {
            this.data.deletedOPIds.push(id);
        }
        let list = (this.data && this.data.agendamentosOP) ? this.data.agendamentosOP : [];
        this.data.agendamentosOP = list.filter(a => a.id !== id);
        this.saveData(this.data);
        this.logAuditEvent("Orientação", `Excluído agendamento ${id}`, "Orientação");
        return true;
    }

    deleteAgendamento(id) {
        return this.deleteAgendamentoOP(id);
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
        const equipe = this.getEquipeEscolar();
        const deEquipe = equipe.filter(p => p.setor === "orientacao");
        
        // Mantém estritamente apenas as orientadoras cadastradas no quadro da equipe escolar
        const orientadorasValidas = deEquipe.map(p => {
            const existente = (this.data.orientadoras || []).find(o => 
                o.id === p.id || 
                o.nome.toLowerCase().trim() === p.nome.toLowerCase().trim() ||
                (p.nome.toLowerCase().includes("clarinda") && (o.id === "orient-1" || (o.nome && (o.nome.includes("Carmen") || o.nome.includes("1"))))) ||
                (p.nome.toLowerCase().includes("daiane") && (o.id === "orient-2" || (o.nome && (o.nome.includes("Luciana") || o.nome.includes("2")))))
            );
            return {
                id: p.id,
                nome: p.nome,
                telefone: p.telefone || (existente ? existente.telefone : ""),
                email: p.email || (existente ? existente.email : "")
            };
        });

        if (orientadorasValidas.length > 0) {
            this.data.orientadoras = orientadorasValidas;
            this.saveData(this.data);
        }
        return this.data.orientadoras || [];
    }

    saveOrientadora(id, nome, telefone, email) {
        const list = this.getOrientadoras();
        const item = list.find(o => o.id === id || o.nome === nome);
        if (item) {
            if (telefone) item.telefone = telefone;
            if (email) item.email = email;
            if (nome) item.nome = nome;
        } else {
            list.push({ id: id || ("orient-" + Date.now()), nome, telefone, email });
        }
        this.saveData(this.data);
    }

    getSupervisoras() {
        if (!this.data.supervisoras || !Array.isArray(this.data.supervisoras)) {
            this.data.supervisoras = defaultSigeData.supervisoras || [];
        }
        const equipe = this.getEquipeEscolar();
        const deEquipe = equipe.filter(p => p.setor === "supervisao");
        deEquipe.forEach(p => {
            const idx = this.data.supervisoras.findIndex(s => s.id === p.id || s.nome.toLowerCase().trim() === p.nome.toLowerCase().trim());
            if (idx >= 0) {
                this.data.supervisoras[idx] = { ...this.data.supervisoras[idx], id: p.id, nome: p.nome, telefone: p.telefone || this.data.supervisoras[idx].telefone, email: p.email || this.data.supervisoras[idx].email };
            } else {
                this.data.supervisoras.push({ id: p.id, nome: p.nome, telefone: p.telefone || "", email: p.email || "" });
            }
        });
        return this.data.supervisoras;
    }

    saveSupervisora(id, nome, telefone, email) {
        const list = this.getSupervisoras();
        const item = list.find(s => s.id === id || s.nome === nome);
        if (item) {
            if (telefone) item.telefone = telefone;
            if (email) item.email = email;
            if (nome) item.nome = nome;
        } else {
            list.push({ id: id || ("sup-" + Date.now()), nome, telefone: telefone || "", email: email || "" });
        }
        this.saveData(this.data);
    }

    getProfessores() {
        if (!this.data.professores || !Array.isArray(this.data.professores)) {
            this.data.professores = defaultSigeData.professores || [];
        }
        const equipe = this.getEquipeEscolar();
        const deEquipe = equipe.filter(p => p.setor === "docentes");
        deEquipe.forEach(p => {
            const idx = this.data.professores.findIndex(prof => prof.id === p.id || prof.nome.toLowerCase().trim() === p.nome.toLowerCase().trim());
            if (idx >= 0) {
                this.data.professores[idx] = { ...this.data.professores[idx], id: p.id, nome: p.nome, telefone: p.telefone || this.data.professores[idx].telefone, email: p.email || this.data.professores[idx].email, disciplina: p.disciplina || this.data.professores[idx].disciplina };
            } else {
                this.data.professores.push({ id: p.id, nome: p.nome, telefone: p.telefone || "", email: p.email || "", disciplina: p.disciplina || "" });
            }
        });
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
            profData.id = generateSecureId("prof");
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
            profData.id = generateSecureId("prof");
            list.push(profData);
        }
        
        if (profData.setor === "docentes") {
            this.saveProfessor(profData);
        } else if (profData.setor === "orientacao") {
            this.saveOrientadora(profData.id, profData.nome, profData.telefone, profData.email);
        } else if (profData.setor === "supervisao") {
            this.saveSupervisora(profData.id, profData.nome, profData.telefone, profData.email);
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
        this.syncTurmasFromImportedAlunos();
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
            turmaData.id = generateSecureId("turma");
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

    saveAgendamentosOP(agendamentos) {
        if (this.data) {
            this.data.agendamentosOP = agendamentos;
            this.saveData(this.data);
        }
    }

    addAgendamentoOP(agendamento) {
        // Verifica se o dia esta bloqueado pela Direcao
        if (this.isDiaBloqueado(agendamento.data)) {
            const blockObj = this.data.diasBloqueados.find(d => d.data === agendamento.data);
            throw new Error(`Data Bloqueada pela Direção (${agendamento.data}): ${blockObj ? blockObj.motivo : 'Recesso / Conselho'}`);
        }

        // Validação estrita de limite por Orientadora (máximo 4 atendimentos por turno por orientadora)
        const oriTurnoAppointments = this.data.agendamentosOP.filter(
            a => a.data === agendamento.data && 
                 a.turno === agendamento.turno && 
                 a.statusSecretaria !== "cancelado" &&
                 (a.orientadora === agendamento.orientadora || (!a.orientadora && agendamento.orientadora.includes("Clarinda")))
        );

        if (oriTurnoAppointments.length >= 4) {
            throw new Error(`Limite atingido! A orientadora (${agendamento.orientadora || 'Orientação'}) já possui 4 atendimentos agendados no turno ${agendamento.turno.toUpperCase()} nesta data.`);
        }

        agendamento.id = generateSecureId("op");
        agendamento.criadoEm = new Date().toISOString();
        if (agendamento.aluno) {
            agendamento.aluno = cleanStudentName(agendamento.aluno);
        }
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
        demanda.id = generateSecureId("sup");
        demanda.criadoEm = getLocalDateISO();
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
        proj.id = generateSecureId("proj");
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
        proj.id = generateSecureId("proj-op");
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
        act.id = generateSecureId("ext");
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
        reun.id = generateSecureId("reun");
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
        demanda.id = generateSecureId("adm");
        demanda.criadoEm = getLocalDateISO();
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
        aviso.id = generateSecureId("av");
        aviso.data = getLocalDateISO();
        this.data.muralAvisos.unshift(aviso);
        this.saveData(this.data);
        return aviso;
    }

    // Calendário de Tarefas
    getCalendarioTarefas() {
        return this.data.calendarioTarefas || [];
    }

    addTarefaCalendario(tarefa) {
        tarefa.id = generateSecureId("cal");
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

    // ==========================================
    // MÓDULO DE UNIFORMES ESCOLARES
    // ==========================================
    getPedidosUniformes() {
        if (!this.data.pedidosUniformes || !Array.isArray(this.data.pedidosUniformes)) {
            this.data.pedidosUniformes = defaultSigeData.pedidosUniformes || [];
            this.saveData(this.data);
        }
        return this.data.pedidosUniformes;
    }

    addPedidoUniforme(pedido) {
        pedido.id = generateSecureId("uni");
        pedido.criadoEm = new Date().toISOString();
        if (!pedido.status) pedido.status = "pendente_envio";
        if (pedido.aluno) {
            pedido.aluno = cleanStudentName(pedido.aluno);
        }
        if (!this.data.pedidosUniformes) this.data.pedidosUniformes = [];
        this.data.pedidosUniformes.unshift(pedido);
        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Registrado pedido de uniforme para ${pedido.aluno} (${pedido.turma})`, pedido.responsavelPedido || "Secretaria");
        return pedido;
    }

    updatePedidoUniforme(id, dados) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === id);
        if (ped) {
            Object.assign(ped, dados);
            this.saveData(this.data);
        }
        return ped;
    }

    cancelarPedidoUniforme(id) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === id);
        if (ped) {
            ped.status = "cancelado";
            this.saveData(this.data);
            this.logAuditEvent("Uniformes Escolares", `Cancelado pedido ID: ${id} (${ped.aluno})`, "Secretaria");
        }
    }

    getLotesSME() {
        if (!this.data.lotesSME || !Array.isArray(this.data.lotesSME)) {
            this.data.lotesSME = defaultSigeData.lotesSME || [];
            this.saveData(this.data);
        }
        return this.data.lotesSME;
    }

    fecharLoteSME(pedidosIds, dataEnvioSme, previsaoRecebimento, observacoes = "") {
        if (!pedidosIds || pedidosIds.length === 0) {
            throw new Error("Selecione ao menos um pedido de uniforme para fechar a remessa!");
        }

        const pedidosValidados = [];
        pedidosIds.forEach(id => {
            const ped = this.data.pedidosUniformes.find(p => p.id === id);
            if (!ped) return;
            if (ped.loteSmeId || ped.status !== "pendente_envio") {
                throw new Error(`O pedido de ${ped.aluno} (${ped.turma}) já pertence ao Lote ${ped.loteSmeId || 'anterior'} e não pode ser incluído em uma nova remessa!`);
            }
            pedidosValidados.push(ped);
        });

        if (pedidosValidados.length === 0) {
            throw new Error("Nenhum pedido pendente válido selecionado!");
        }

        const loteId = generateSecureId("lote-sme");
        const codigoLote = "REMESSA-" + new Date().toISOString().substring(0,7) + "-" + Math.floor(10 + Math.random()*90);

        const lote = {
            id: loteId,
            codigoLote: codigoLote,
            dataCorte: dataEnvioSme || getLocalDateISO(),
            dataEnvioSme: dataEnvioSme || getLocalDateISO(),
            previsaoRecebimento: previsaoRecebimento || "",
            dataChegadaReal: null,
            status: "enviado_sme",
            observacoes: observacoes,
            pedidosIds: pedidosValidados.map(p => p.id),
            responsavelFechamento: this.getRoleFormatted(),
            criadoEm: new Date().toISOString()
        };

        if (!this.data.lotesSME) this.data.lotesSME = [];
        this.data.lotesSME.unshift(lote);

        // Atualizar status dos pedidos vinculados ao lote
        pedidosValidados.forEach(ped => {
            ped.status = "enviado_sme";
            ped.loteSmeId = loteId;
            ped.dataEnvioSme = lote.dataEnvioSme;
            ped.previsaoRecebimentoSme = lote.previsaoRecebimento;
        });

        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Fechado Lote SME ${codigoLote} com ${pedidosValidados.length} pedidos.`, "Secretaria");
        return lote;
    }

    registrarRecebimentoLoteSME(loteId, dataChegadaReal, observacoes = "", mapaConferencia = {}) {
        const lote = (this.getLotesSME()).find(l => l.id === loteId);
        if (lote) {
            lote.dataChegadaReal = dataChegadaReal || getLocalDateISO();
            let temDivergencia = false;

            lote.pedidosIds.forEach(id => {
                const ped = this.data.pedidosUniformes.find(p => p.id === id);
                if (ped) {
                    const statusConf = mapaConferencia[id] || "recebido"; // "recebido" ou "divergente"
                    if (statusConf === "recebido") {
                        if (ped.status !== "entregue") {
                            ped.status = "disponivel_estoque";
                            ped.dataChegadaEscola = lote.dataChegadaReal;
                        }
                    } else {
                        // O item não veio no lote da SME -> Fica em aberto para novo pedido de lote à SME
                        ped.status = "pendente_envio";
                        ped.loteAnteriorId = loteId;
                        ped.loteSmeId = null;
                        ped.observacoesDivergencia = `Não entregue no Lote ${lote.codigoLote} — Liberado e em aberto para novo pedido à SME.`;
                        temDivergencia = true;
                    }
                }
            });

            lote.status = temDivergencia ? "recebido_parcial" : "recebido_total";
            if (observacoes) lote.observacoes = (lote.observacoes ? lote.observacoes + " | " : "") + observacoes;

            this.saveData(this.data);
            this.logAuditEvent("Uniformes Escolares", `Registrada chegada do Lote SME ${lote.codigoLote} na escola (${lote.status}).`, "Secretaria");
        }
        return lote;
    }

    reincluirPedidoEmNovoLoteSME(id) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === id);
        if (ped) {
            ped.status = "pendente_envio";
            ped.loteSmeId = null;
            this.saveData(this.data);
            this.logAuditEvent("Uniformes Escolares", `Pedido ID: ${id} (${ped.aluno}) liberado para novo lote SME.`, "Secretaria");
        }
        return ped;
    }

    getEstoqueUniformes() {
        if (!this.data.estoqueUniformes || typeof this.data.estoqueUniformes !== "object" || !this.data.estoqueUniformes.masculino) {
            this.data.estoqueUniformes = defaultSigeData.estoqueUniformes || {
                masculino: {
                    "camiseta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "bermuda": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "calca": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "moleton": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "jaqueta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
                },
                feminino: {
                    "camiseta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "bermuda": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "calca": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "moleton": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "jaqueta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
                }
            };
            this.saveData(this.data);
        }
        return this.data.estoqueUniformes;
    }

    ajustarEstoqueUniforme(peca, tamanho, quantidade, acao = "somar", genero = "Masculino") {
        const est = this.getEstoqueUniformes();
        const genKey = (genero && genero.toLowerCase().includes("fem")) ? "feminino" : "masculino";

        if (!est[genKey]) est[genKey] = {};
        if (!est[genKey][peca]) est[genKey][peca] = {};

        const atual = est[genKey][peca][tamanho] || 0;
        const val = parseInt(quantidade) || 0;

        if (acao === "somar") {
            est[genKey][peca][tamanho] = atual + val;
        } else if (acao === "subtrair") {
            est[genKey][peca][tamanho] = Math.max(0, atual - val);
        } else if (acao === "definir") {
            est[genKey][peca][tamanho] = Math.max(0, val);
        }

        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Ajuste de estoque (${genKey}): ${peca.toUpperCase()} Tam ${tamanho} -> Novo Saldo: ${est[genKey][peca][tamanho]} (${acao})`, "Secretaria");
        return est[genKey][peca][tamanho];
    }

    darBaixaEntregaUniforme(pedidoId, entreguePor, darBaixaEstoque = false) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === pedidoId);
        if (!ped) throw new Error("Pedido de uniforme não encontrado!");

        ped.status = "entregue";
        ped.dataEntregaAluno = getLocalDateISO();
        ped.entreguePor = entreguePor || this.getRoleFormatted();

        if (darBaixaEstoque) {
            const tam = ped.tamanho;
            const gen = ped.genero || "Masculino";

            if (ped.tipoItem === "kit_completo") {
                if (ped.estacao === "verao") {
                    this.ajustarEstoqueUniforme("camiseta", tam, 2, "subtrair", gen);
                    this.ajustarEstoqueUniforme("bermuda", tam, 2, "subtrair", gen);
                } else {
                    this.ajustarEstoqueUniforme("camiseta", tam, 2, "subtrair", gen);
                    this.ajustarEstoqueUniforme("calca", tam, 2, "subtrair", gen);
                    this.ajustarEstoqueUniforme("moleton", tam, 1, "subtrair", gen);
                }
            } else if (ped.pecasAvulsas && Array.isArray(ped.pecasAvulsas)) {
                ped.pecasAvulsas.forEach(peca => {
                    this.ajustarEstoqueUniforme(peca, tam, 1, "subtrair", gen);
                });
            }
        }

        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Uniforme entregue ao aluno ${ped.aluno} (${ped.turma}) por ${ped.entreguePor}`, ped.entreguePor);
        return ped;
    }

    // Notificações Inteligentes Filtradas por Perfil
    getNotificacoesPertinentes() {
        const role = this.getRole();
        const list = [];
        const hojeStr = getLocalDateISO();

        // 0. Uniformes Escolares (Secretaria, Direção, Admin)
        if (role === "secretaria" || role === "direcao" || role === "admin" || role === "desenvolvedor") {
            const pendentesSme = this.getPedidosUniformes().filter(p => p.status === "pendente_envio");
            if (pendentesSme.length > 0) {
                list.push({
                    id: `notif-uni-sme`,
                    title: `👕 Pedidos de Uniforme Pendentes de Envio à SME (${pendentesSme.length})`,
                    desc: `Existem pedidos aguardando fechamento de lote para remessa à SME.`,
                    time: `Ação necessária`,
                    targetTab: "uniformes",
                    unread: !this.data.notificacoesLidas.includes(`notif-uni-sme`)
                });
            }

            const disponiveisEntrega = this.getPedidosUniformes().filter(p => p.status === "disponivel_estoque");
            if (disponiveisEntrega.length > 0) {
                list.push({
                    id: `notif-uni-entrega`,
                    title: `📦 Uniformes Prontos para Entrega aos Alunos (${disponiveisEntrega.length})`,
                    desc: `Uniformes chegaram da SME ou estão disponíveis no estoque local para distribuição.`,
                    time: `Pronto para entrega`,
                    targetTab: "uniformes",
                    unread: !this.data.notificacoesLidas.includes(`notif-uni-entrega`)
                });
            }
        }

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

    getUserName() {
        const logged = this.getLoggedUser();
        return logged ? (logged.nome || logged.email || null) : null;
    }

    getRoleFormatted() {
        const role = this.getRole();
        const roleMap = {
            desenvolvedor: 'Desenvolvedor do Sistema',
            direcao: 'Direção Escolar',
            orientadora_clarinda: 'Orientadora Clarinda (Anos Iniciais)',
            orientadora_daiane: 'Orientadora Daiane (Anos Finais)',
            supervisao: 'Supervisão Pedagógica',
            secretaria: 'Secretaria Escolar',
            admin: 'Administrador'
        };
        return roleMap[role] || this.getUserName() || 'Gestão Escolar';
    }

    async criarTokenConfirmacao(agendamentoId) {
        const ag = (this.data.agendamentosOP || []).find(a => a.id === agendamentoId);
        if (!ag || !this.firestore) return null;
        const token = generateSecureId('token');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const docData = {
            agendamentoId: ag.id,
            aluno: ag.aluno || '',
            turma: ag.turma || '',
            data: ag.data || '',
            horario: ag.horario || '',
            orientadora: ag.orientadora || '',
            responsavel: ag.responsavel || '',
            status: ag.statusSecretaria || 'aguardando',
            expiresAt: expiresAt.toISOString(),
            criadoEm: new Date().toISOString()
        };
        try {
            await this.firestore.collection('confirmacoes_op').doc(token).set(docData);
            return token;
        } catch (e) {
            console.error('Erro ao criar token de confirmacao:', e);
            return null;
        }
    }

    async atualizarStatusPorToken(agendamentoId, novoStatus, obs) {
        if (!this.firestore || !agendamentoId) return;
        try {
            const ags = this.data.agendamentosOP || [];
            const idx = ags.findIndex(a => a.id === agendamentoId);
            if (idx !== -1) {
                ags[idx].statusSecretaria = novoStatus;
                if (obs) ags[idx].obsSecretaria = obs;
                ags[idx].confirmadoEm = new Date().toISOString();
                await this.firestore.collection('sige_pedro_rizzi').doc('database').set(
                    { agendamentosOP: ags }, { merge: true }
                );
            }
        } catch (e) {
            console.error('Erro ao atualizar status por token:', e);
        }
    }

    // ==========================================
    // MÉTODOS DO MÓDULO DA DIREÇÃO & GESTÃO
    // ==========================================

    getAtasGabinete() {
        return (this.data && Array.isArray(this.data.atasGabineteDirecao)) ? this.data.atasGabineteDirecao : [];
    }

    addAtaGabinete(ata) {
        if (!this.data.atasGabineteDirecao) this.data.atasGabineteDirecao = [];
        const novaAta = {
            id: generateSecureId('ata-dir'),
            data: ata.data || new Date().toISOString(),
            titulo: ata.titulo || 'Atendimento de Gabinete',
            tipo: ata.tipo || 'pais',
            tipoDesc: ata.tipoDesc || 'Atendimento Geral',
            participantes: ata.participantes || '',
            alunoRelacionado: ata.alunoRelacionado || '',
            turmaRelacionada: ata.turmaRelacionada || '',
            pauta: ata.pauta || '',
            combinados: ata.combinados || '',
            encaminhamentos: ata.encaminhamentos || '',
            autor: this.getUserName() || 'Direção Escolar',
            status: ata.status || 'concluida',
            criadoEm: new Date().toISOString()
        };
        this.data.atasGabineteDirecao.unshift(novaAta);
        this.addAuditLog('Cadastro de Ata de Gabinete (' + novaAta.titulo + ')', 'Direção');
        this.saveData(this.data);
        return novaAta;
    }

    deleteAtaGabinete(id) {
        if (!this.data.atasGabineteDirecao) return;
        this.data.atasGabineteDirecao = this.data.atasGabineteDirecao.filter(a => a.id !== id);
        this.addAuditLog('Exclusão de Ata de Gabinete (ID: ' + id + ')', 'Direção');
        this.saveData(this.data);
    }

    getEventosCalendarioEscolar() {
        return (this.data && Array.isArray(this.data.eventosCalendarioEscolar)) ? this.data.eventosCalendarioEscolar : [];
    }

    addEventoCalendarioEscolar(ev) {
        if (!this.data.eventosCalendarioEscolar) this.data.eventosCalendarioEscolar = [];
        const novoEvento = {
            id: generateSecureId('cal-ev'),
            data: ev.data || getLocalDateISO(),
            hora: ev.hora || '08:00',
            titulo: ev.titulo || 'Evento Escolar',
            categoria: ev.categoria || 'reuniao_pedagogica',
            categoriaDesc: ev.categoriaDesc || 'Reunião Pedagógica',
            descricao: ev.descricao || '',
            publicoAlvo: ev.publicoAlvo || 'escola_toda',
            local: ev.local || 'Escola',
            status: ev.status || 'agendado',
            criadoEm: new Date().toISOString()
        };
        this.data.eventosCalendarioEscolar.push(novoEvento);
        // Ordena por data
        this.data.eventosCalendarioEscolar.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
        this.addAuditLog('Novo Evento no Calendário Letivo (' + novoEvento.titulo + ')', 'Direção');
        this.saveData(this.data);
        return novoEvento;
    }

    deleteEventoCalendarioEscolar(id) {
        if (!this.data.eventosCalendarioEscolar) return;
        this.data.eventosCalendarioEscolar = this.data.eventosCalendarioEscolar.filter(e => e.id !== id);
        this.addAuditLog('Exclusão de Evento do Calendário (ID: ' + id + ')', 'Direção');
        this.saveData(this.data);
    }

    getContatosWhatsApp() {
        return (this.data && Array.isArray(this.data.contatosWhatsAppDirecao)) ? this.data.contatosWhatsAppDirecao : [];
    }

    getAllTagsContatos() {
        const contatos = this.getContatosWhatsApp();
        const tagsSet = new Set();
        contatos.forEach(c => {
            if (Array.isArray(c.tags)) {
                c.tags.forEach(t => { if (t && typeof t === 'string' && t.trim()) tagsSet.add(t.trim()); });
            } else if (c.tag && typeof c.tag === 'string') {
                c.tag.split(',').forEach(t => { if (t && t.trim()) tagsSet.add(t.trim()); });
            }
        });
        return Array.from(tagsSet).sort();
    }

    addContatoWhatsApp(c) {
        if (!this.data.contatosWhatsAppDirecao) this.data.contatosWhatsAppDirecao = [];
        
        let tagsArr = [];
        if (Array.isArray(c.tags)) {
            tagsArr = c.tags.map(t => String(t).trim()).filter(Boolean);
        } else if (c.tag && typeof c.tag === 'string') {
            tagsArr = c.tag.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (tagsArr.length === 0) tagsArr = ['Geral'];

        const novoContato = {
            id: generateSecureId('w-cont'),
            nome: c.nome || '',
            telefone: (c.telefone || '').replace(/\D/g, ''),
            tags: tagsArr,
            tag: tagsArr.join(', '),
            notas: c.notas || '',
            criadoEm: new Date().toISOString()
        };
        this.data.contatosWhatsAppDirecao.push(novoContato);
        this.saveData(this.data);
        return novoContato;
    }

    addContatosEmLote(contatosList) {
        if (!this.data.contatosWhatsAppDirecao) this.data.contatosWhatsAppDirecao = [];
        if (!Array.isArray(contatosList)) return 0;

        let adicionados = 0;
        contatosList.forEach(c => {
            const fone = (c.telefone || '').replace(/\D/g, '');
            if (!c.nome || !fone) return;

            let tagsArr = [];
            if (Array.isArray(c.tags)) {
                tagsArr = c.tags.map(t => String(t).trim()).filter(Boolean);
            } else if (c.tag && typeof c.tag === 'string') {
                tagsArr = c.tag.split(',').map(t => t.trim()).filter(Boolean);
            }
            if (tagsArr.length === 0) tagsArr = ['Importado'];

            const existe = this.data.contatosWhatsAppDirecao.find(ex => ex.telefone === fone);
            if (existe) {
                // Atualiza tags e nome
                existe.nome = c.nome;
                const setCombinado = new Set([...(existe.tags || [existe.tag || 'Geral']), ...tagsArr]);
                existe.tags = Array.from(setCombinado);
                existe.tag = existe.tags.join(', ');
                if (c.notas) existe.notas = c.notas;
            } else {
                this.data.contatosWhatsAppDirecao.push({
                    id: generateSecureId('w-cont'),
                    nome: c.nome,
                    telefone: fone,
                    tags: tagsArr,
                    tag: tagsArr.join(', '),
                    notas: c.notas || '',
                    criadoEm: new Date().toISOString()
                });
                adicionados++;
            }
        });

        this.saveData(this.data);
        return adicionados;
    }

    deleteContatoWhatsApp(id) {
        if (!this.data.contatosWhatsAppDirecao) return;
        this.data.contatosWhatsAppDirecao = this.data.contatosWhatsAppDirecao.filter(c => c.id !== id);
        this.saveData(this.data);
    }

    getMensagensWhatsAppLog() {
        return (this.data && Array.isArray(this.data.mensagensWhatsAppLog)) ? this.data.mensagensWhatsAppLog : [];
    }

    addMensagemWhatsAppLog(log) {
        if (!this.data.mensagensWhatsAppLog) this.data.mensagensWhatsAppLog = [];
        const novoLog = {
            id: generateSecureId('w-log'),
            contatoNome: log.contatoNome || '',
            telefone: log.telefone || '',
            tag: log.tag || '',
            tags: Array.isArray(log.tags) ? log.tags : (log.tag ? [log.tag] : []),
            mensagem: log.mensagem || '',
            enviadoEm: new Date().toISOString(),
            status: log.status || 'enviado', // enviado, lido, confirmado, nao_respondeu
            enviadoPor: this.getUserName() || 'Direção'
        };
        this.data.mensagensWhatsAppLog.unshift(novoLog);
        this.saveData(this.data);
        return novoLog;
    }

    atualizarStatusMensagemLog(id, novoStatus) {
        if (!this.data || !Array.isArray(this.data.mensagensWhatsAppLog)) return false;
        const msg = this.data.mensagensWhatsAppLog.find(m => m.id === id);
        if (msg) {
            msg.status = novoStatus;
            msg.atualizadoEm = new Date().toISOString();
            this.saveData(this.data);
            return true;
        }
        return false;
    }

    deleteMensagemWhatsAppLog(id) {
        if (!this.data || !Array.isArray(this.data.mensagensWhatsAppLog)) return false;
        this.data.mensagensWhatsAppLog = this.data.mensagensWhatsAppLog.filter(m => m.id !== id);
        this.saveData(this.data);
        return true;
    }

    salvarPermissoesUsuario(email, permissoesMap) {
        if (!this.data || !Array.isArray(this.data.usuariosCadastrados)) return false;
        const u = this.data.usuariosCadastrados.find(user => user.email.toLowerCase() === email.toLowerCase());
        if (u) {
            u.permissoes = { ...u.permissoes, ...permissoesMap };
            this.addAuditLog('Atualização de Permissões Modulares (' + u.nome + ')', 'Admin');
            this.saveData(this.data);
            return true;
        }
        return false;
    }

    temPermissaoModulo(moduloId) {
        const user = this.getLoggedUser();
        if (!user) return false;
        if (user.role === 'desenvolvedor') return true;
        if (!user.permissoes) {
            if (user.role === 'direcao') return true;
            if (user.role === 'admin') return true;
            if (moduloId === 'op' && (user.role.startsWith('orientadora') || user.role === 'secretaria')) return true;
            if (moduloId === 'supervisao' && user.role === 'supervisao') return true;
            if (moduloId === 'uniformes' && (user.role === 'secretaria' || user.role === 'direcao')) return true;
            if (moduloId === 'mural') return true;
            return false;
        }
        return !!user.permissoes[moduloId];
    }
}

// Instância Global
const sigeDB = new SigeDatabase();
window.sigeDB = sigeDB;
