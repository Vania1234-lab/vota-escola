(function(){
  const cfg = window.VOTA_ESCOLA_FIREBASE_CONFIG || {};
  const firebaseReady = !!(cfg.apiKey && cfg.projectId);

  const defaults = {
    election: {
      name: "Eleição do Grêmio Estudantil",
      school: "Minha Escola",
      registrationOpen: true,
      votingOpen: false,
      resultsReleased: false
    },
    cargos: [
      "Presidente",
      "Secretário",
      "Tesoureiro",
      "Diretor de Comunicação",
      "Diretor de Cultura",
      "Diretor de Esportes",
      "Diretor de Eventos",
      "Diretor de Meio Ambiente",
      "Diretor de Direitos Humanos"
    ]
  };

  const LS = {
    get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
    set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  };

  function uid(){ return (crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2)); }
  function now(){ return new Date().toISOString(); }

  // ---------- DEMO STORE ----------
  const Demo = {
    async init(){
      if(!LS.get("ve_election")) LS.set("ve_election", defaults.election);
      if(!LS.get("ve_cargos")) LS.set("ve_cargos", defaults.cargos);
      if(!LS.get("ve_candidaturas")) LS.set("ve_candidaturas", []);
      if(!LS.get("ve_eleitores")) LS.set("ve_eleitores", []);
      if(!LS.get("ve_votos")) LS.set("ve_votos", []);
    },
    async getElection(){ return LS.get("ve_election", defaults.election); },
    async setElection(data){ LS.set("ve_election", data); return data; },
    async getCargos(){ return LS.get("ve_cargos", defaults.cargos); },
    async saveCandidatura(data){
      const arr=LS.get("ve_candidaturas",[]);
      arr.push({...data,id:uid(),status:"pendente",createdAt:now()});
      LS.set("ve_candidaturas",arr);
    },
    async listCandidaturas(){ return LS.get("ve_candidaturas",[]); },
    async updateCandidatura(id, patch){
      const arr=LS.get("ve_candidaturas",[]).map(x=>x.id===id?{...x,...patch}:x);
      LS.set("ve_candidaturas",arr);
    },
    async approvedByCargo(cargo){
      const norm=s=>String(s||"").trim().toLocaleLowerCase("pt-BR");
      const num=s=>{
        const d=String(s??"").replace(/\D/g,"");
        return d ? d.padStart(2,"0").slice(-2) : "";
      };
      const arr=LS.get("ve_candidaturas",[]);
      const out=[];
      for(const c of arr.filter(x=>norm(x.status)==="aprovado")){
        for(const item of (c.cargos||[])){
          if(norm(item.cargo)===norm(cargo)){
            out.push({...c, numero:num(item.numero), cargo:item.cargo});
          }
        }
      }
      return out;
    },
    async getVoter(ra){
      const bruto=String(ra||"").trim();
      const digitos=bruto.replace(/\D/g,"");
      return LS.get("ve_eleitores",[]).find(x=>{
        const xr=String(x.ra||"").trim();
        return xr===bruto || (digitos && xr.replace(/\D/g,"")===digitos);
      }) || null;
    },
    async addVoter(data){
      const ra=String(data.ra||"").trim();
      if(!ra) throw new Error("RA obrigatório.");
      const arr=LS.get("ve_eleitores",[]);
      const idx=arr.findIndex(x=>String(x.ra)===ra);
      const voter={
        ra,
        nome:String(data.nome||"").trim(),
        turma:String(data.turma||"").trim(),
        ativo:data.ativo!==false,
        votedCargos: idx>=0 ? (arr[idx].votedCargos||[]) : [],
        createdAt: idx>=0 ? arr[idx].createdAt : now(),
        updatedAt: now()
      };
      if(idx>=0) arr[idx]={...arr[idx],...voter};
      else arr.push(voter);
      LS.set("ve_eleitores",arr);
      return voter;
    },
    async addVoters(list){
      for(const item of list) await this.addVoter(item);
    },
    async deleteVoter(ra){
      const arr=LS.get("ve_eleitores",[]).filter(x=>String(x.ra)!==String(ra));
      LS.set("ve_eleitores",arr);
    },
    async recordVoteForVoter(ra,cargo,vote){
      const arr=LS.get("ve_eleitores",[]);
      const idx=arr.findIndex(x=>String(x.ra)===String(ra));
      if(idx<0) throw new Error("ELEITOR_NAO_CADASTRADO");
      const voter=arr[idx];
      if(voter.ativo===false) throw new Error("ELEITOR_INATIVO");
      const voted=Array.isArray(voter.votedCargos)?voter.votedCargos:[];
      if(voted.includes(cargo)) throw new Error("CARGO_JA_VOTADO");

      // O RA fica apenas no cadastro do eleitor; o documento do voto não recebe RA.
      const votos=LS.get("ve_votos",[]);
      votos.push({...vote,cargo,id:uid(),createdAt:now()});
      LS.set("ve_votos",votos);

      arr[idx]={...voter,votedCargos:[...voted,cargo],lastVoteAt:now()};
      LS.set("ve_eleitores",arr);
    },
    async saveVote(vote){
      const arr=LS.get("ve_votos",[]);
      arr.push({...vote,id:uid(),createdAt:now()});
      LS.set("ve_votos",arr);
    },
    async listVotes(){ return LS.get("ve_votos",[]); },
    async listVoters(){ return LS.get("ve_eleitores",[]); },
    async savePublicResults(data){
      LS.set("ve_resultado_publico", data);
    },
    async getPublicResults(){
      return LS.get("ve_resultado_publico", null);
    }
  };

  // ---------- FIREBASE STORE ----------
  const Fire = {
    app:null, db:null,
    async init(){
      if(!firebaseReady) return;
      if(!window.firebase) throw new Error("SDK Firebase não carregado.");
      this.app = firebase.apps && firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(cfg);
      this.db = firebase.firestore();
    },
    async ensureDefaults(){
      const ref=this.db.collection("config").doc("eleicao");
      const snap=await ref.get();
      if(!snap.exists) await ref.set(defaults.election);
      const cargosRef=this.db.collection("config").doc("cargos");
      const cs=await cargosRef.get();
      if(!cs.exists) await cargosRef.set({lista:defaults.cargos});
    },
    async getElection(){
      try{
        const s=await this.db.collection("config").doc("eleicao").get();
        return s.exists ? {...defaults.election, ...s.data()} : defaults.election;
      }catch(e){
        console.warn("Usando configuração padrão da eleição:", e);
        return defaults.election;
      }
    },
    async setElection(data){
      await this.db.collection("config").doc("eleicao").set(data,{merge:true});
      return data;
    },
    async getCargos(){
      try{
        const s=await this.db.collection("config").doc("cargos").get();
        return (s.exists && s.data() && Array.isArray(s.data().lista) && s.data().lista.length)
          ? s.data().lista
          : defaults.cargos;
      }catch(e){
        console.warn("Usando cargos padrão:", e);
        return defaults.cargos;
      }
    },
    async saveCandidatura(data){
      await this.db.collection("candidaturas").add({...data,status:"pendente",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    },
    async listCandidaturas(){
      const q=await this.db.collection("candidaturas").get();
      return q.docs.map(d=>({id:d.id,...d.data()}));
    },
    async updateCandidatura(id,patch){
      await this.db.collection("candidaturas").doc(id).update(patch);
    },
    async approvedByCargo(cargo){
      const norm=s=>String(s||"").trim().toLocaleLowerCase("pt-BR");
      const num=s=>{
        const d=String(s??"").replace(/\D/g,"");
        return d ? d.padStart(2,"0").slice(-2) : "";
      };
      const arr=await this.listCandidaturas();
      const out=[];
      arr.filter(x=>norm(x.status)==="aprovado").forEach(c=>{
        (c.cargos||[]).forEach(item=>{
          if(norm(item.cargo)===norm(cargo)){
            out.push({...c,numero:num(item.numero),cargo:item.cargo});
          }
        });
      });
      return out;
    },
    async getVoter(ra){
      const bruto=String(ra||"").trim();
      if(!bruto) return null;

      // 1. Busca exatamente como foi cadastrado.
      let s=await this.db.collection("eleitores").doc(bruto).get();
      if(s.exists) return {id:s.id,ra:s.id,...s.data()};

      // 2. Compatibilidade com RAs digitados com/sem pontuação.
      const digitos=bruto.replace(/\D/g,"");
      if(digitos && digitos!==bruto){
        s=await this.db.collection("eleitores").doc(digitos).get();
        if(s.exists) return {id:s.id,ra:s.id,...s.data()};
      }

      // 3. Último fallback: procura por campo ra, caso exista em dados antigos.
      try{
        const q=await this.db.collection("eleitores").where("ra","==",bruto).limit(1).get();
        if(!q.empty){
          const d=q.docs[0];
          return {id:d.id,ra:d.id,...d.data()};
        }
      }catch(e){ console.warn("Busca alternativa de RA não disponível:",e); }

      return null;
    },
    async addVoter(data){
      const ra=String(data.ra||"").trim();
      if(!ra) throw new Error("RA obrigatório.");
      await this.db.collection("eleitores").doc(ra).set({
        nome:String(data.nome||"").trim(),
        turma:String(data.turma||"").trim(),
        ativo:data.ativo!==false,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
    },
    async addVoters(list){
      const chunks=[];
      for(let i=0;i<list.length;i+=400) chunks.push(list.slice(i,i+400));
      for(const chunk of chunks){
        const batch=this.db.batch();
        chunk.forEach(data=>{
          const ra=String(data.ra||"").trim();
          if(!ra) return;
          const ref=this.db.collection("eleitores").doc(ra);
          batch.set(ref,{
            nome:String(data.nome||"").trim(),
            turma:String(data.turma||"").trim(),
            ativo:data.ativo!==false,
            updatedAt:firebase.firestore.FieldValue.serverTimestamp()
          },{merge:true});
        });
        await batch.commit();
      }
    },
    async deleteVoter(ra){
      await this.db.collection("eleitores").doc(String(ra)).delete();
    },
    async recordVoteForVoter(ra,cargo,vote){
      const voterRef=this.db.collection("eleitores").doc(String(ra));
      const voteRef=this.db.collection("votos").doc();

      await this.db.runTransaction(async tx=>{
        const s=await tx.get(voterRef);
        if(!s.exists) throw new Error("ELEITOR_NAO_CADASTRADO");

        const data=s.data()||{};
        if(data.ativo===false) throw new Error("ELEITOR_INATIVO");

        const voted=Array.isArray(data.votedCargos)?data.votedCargos:[];
        if(voted.includes(cargo)) throw new Error("CARGO_JA_VOTADO");

        // Atualiza apenas a participação do eleitor.
        tx.set(voterRef,{
          votedCargos:[...voted,cargo],
          lastVoteAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});

        // O voto é gravado separadamente e NÃO contém RA, nome ou turma.
        tx.set(voteRef,{
          ...vote,
          cargo,
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    },
    async saveVote(vote){
      await this.db.collection("votos").add({...vote,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    },
    async listVotes(){
      const q=await this.db.collection("votos").get();
      return q.docs.map(d=>({id:d.id,...d.data()}));
    },
    async listVoters(){
      const q=await this.db.collection("eleitores").get();
      return q.docs.map(d=>({id:d.id,ra:d.id,...d.data()}));
    },
    async savePublicResults(data){
      // Usa config/resultadoPublico porque config já possui leitura pública
      // e escrita restrita a usuário autenticado nas regras atuais do projeto.
      await this.db.collection("config").doc("resultadoPublico").set({
        ...data,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    async getPublicResults(){
      const s=await this.db.collection("config").doc("resultadoPublico").get();
      return s.exists ? s.data() : null;
    }
  };

  const Store = firebaseReady ? Fire : Demo;
  Store.mode = firebaseReady ? "firebase" : "demo";

  function trululu(){
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const seq=[
        [660,.08],[784,.08],[988,.09],[1318,.12]
      ];
      let t=ctx.currentTime;
      seq.forEach(([freq,dur])=>{
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.type="sine"; o.frequency.value=freq;
        g.gain.setValueAtTime(.0001,t);
        g.gain.exponentialRampToValueAtTime(.18,t+.01);
        g.gain.exponentialRampToValueAtTime(.0001,t+dur);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t+dur+.02);
        t+=dur;
      });
    }catch(e){}
  }

  window.VotaEscola = {Store, trululu, defaults};
})();
