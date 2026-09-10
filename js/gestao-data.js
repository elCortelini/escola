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
            titulo: "Alinhamento de Conteúdo e Avaliação - 7º Anos",
            turmaOuProfessor: "Prof. Ricardo (Ciências)",
            categoria: "Planejamento Pedagógico",
            prioridade: "alta", // alta, media, baixa
            status: "em_atendimento", // pendente, em_atendimento, concluido
            descricao: "Revisar critérios de correção da prova mensal e adaptações para alunos com laudo.",
            responsavel: "Prof. Marcos (Supervisão)",
            prazo: "2026-09-12",
            criadoEm: "2026-09-08"
        },
        {
            id: "sup-202",
            titulo: "Observação de Sala de Aula - 6º Ano B",
            turmaOuProfessor: "Turma 6º Ano B",
            categoria: "Gestão de Sala",
            prioridade: "media",
            status: "pendente",
            descricao: "Acompanhar dinamismos e nível de ruído durante aulas de História.",
            responsavel: "Supervisão Pedagógica",
            prazo: "2026-09-15",
            criadoEm: "2026-09-09"
        },
        {
            id: "sup-203",
            titulo: "Entrega dos Diários de Classe referente a Agosto",
            turmaOuProfessor: "Corpo Docente Fund. II",
            categoria: "Documentação",
            prioridade: "baixa",
            status: "concluido",
            descricao: "Conferência e validação das notas e frequências registradas nos diários de classe.",
            responsavel: "Supervisão Pedagógica",
            prazo: "2026-09-05",
            criadoEm: "2026-09-01"
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

    notificacoesLidas: []
};

// Gerenciador de Banco de Dados Local Storage
class SigeDatabase {
    constructor() {
        this.data = this.load();
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

    logWhatsappReminder(id, tipoLembrete) {
        const ag = this.data.agendamentosOP.find(a => a.id === id);
        if (ag) {
            if (!ag.historicoWhatsapp) ag.historicoWhatsapp = [];
            ag.historicoWhatsapp.push({
                tipo: tipoLembrete, // '24h' ou 'no_dia'
                enviadoEm: new Date().toISOString()
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
