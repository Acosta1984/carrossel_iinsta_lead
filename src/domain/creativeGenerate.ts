/** Entrada do agente de criativos Instagram (caption, visual, hashtags, CTA). */
export interface CreativeGenerateRequest {
  /** Tema principal do post (obrigatório). */
  tema: string;
  /** Objetivo da publicação (ex.: informar, converter, engajar). */
  objetivo?: string;
  /** Persona/público-alvo (ex.: mães solo, empreendedores iniciantes). */
  avatar?: string;
  /** Estilo de linguagem (ex.: empático, direto, inspirador). */
  tom?: string;
}

/** Saída do agente: criativo completo para Instagram. */
export interface CreativeGenerateResponse {
  /** Texto principal do post (100–300 palavras, máx. 2.200 caracteres). */
  caption: string;
  /** Descrição detalhada do criativo visual para designers/ferramentas. */
  visual: string;
  /** 5 a 15 hashtags relevantes ao tema. */
  hashtags: string[];
  /** Chamada para ação final. */
  cta: string;
}
