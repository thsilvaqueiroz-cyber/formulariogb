/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';

const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

const faqs = [
  { key: 'faq_localizacao', label: 'Pergunta sobre localização da loja', placeholder: 'Modelo de resposta do agente...' },
  { key: 'faq_horario', label: 'Pergunta sobre horário de funcionamento', placeholder: 'Modelo de resposta...' },
  { key: 'faq_preco', label: 'Pergunta sobre preço de produto', placeholder: 'Como o agente deve responder? Pede qual produto? Envia tabela?' },
  { key: 'faq_tamanho', label: 'Pergunta sobre tamanho disponível', placeholder: 'Modelo de resposta...' },
  { key: 'faq_disponibilidade', label: 'Pergunta sobre disponibilidade de produto', placeholder: 'Se tiver em estoque: ... / Se não tiver: ...' },
  { key: 'faq_kit', label: 'Pergunta sobre preço de kit/combo', placeholder: 'Modelo de resposta...' },
  { key: 'faq_entrega', label: 'Pergunta sobre entrega/frete', placeholder: 'O agente responde o valor ou encaminha para humano?' },
  { key: 'faq_pagamento', label: 'Pergunta sobre formas de pagamento', placeholder: 'Modelo de resposta...' },
  { key: 'faq_atacado', label: 'Pergunta sobre venda no atacado', placeholder: 'Modelo de resposta...' },
  { key: 'faq_marketplace', label: 'Pergunta sobre Mercado Livre/Shopee/Marketplace', placeholder: 'Modelo de resposta...' },
  { key: 'faq_infantil_feminino', label: 'Cliente pergunta se tem roupa infantil ou feminina', placeholder: 'Modelo de resposta...' },
  { key: 'faq_troca_cliente', label: 'Cliente pergunta sobre troca ou devolução', placeholder: 'Modelo de resposta...' },
  { key: 'faq_consultoria', label: 'Cliente pede consultoria de estilo/combinação de peças', placeholder: 'O agente responde? Encaminha para humano?' },
  { key: 'faq_rastreamento_cliente', label: 'Cliente pergunta sobre rastreamento de pedido', placeholder: 'Modelo de resposta...' },
  { key: 'faq_reclamacao', label: 'Cliente reclama de produto ou atendimento', placeholder: 'Como o agente deve agir?' },
  { key: 'faq_followup_cliente', label: 'Cliente some e não finaliza a compra (follow-up)', placeholder: 'O agente faz follow-up? Após quantas horas/dias?' },
];

export default function App() {
  const [products, setProducts] = useState([{ id: 1 }]);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorToast, setErrorToast] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [closedDays, setClosedDays] = useState<Record<number, boolean>>({ 6: true }); // Sunday closed by default

  // Product logic
  const addProduct = () => {
    setProducts(prev => [...prev, { id: prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1 }]);
  };

  const removeProduct = (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Progress logic
  const updateProgress = () => {
    if (!formRef.current) return;
    const inputs = formRef.current.querySelectorAll('input[type=text], input[type=email], input[type=tel], textarea');
    let filled = 0;
    inputs.forEach((inp) => {
      if ((inp as HTMLInputElement | HTMLTextAreaElement).value.trim()) filled++;
    });
    const pct = Math.min(100, Math.round((filled / Math.max(inputs.length, 1)) * 100));
    setProgress(pct);
  };

  useEffect(() => {
    updateProgress();
  }, [products]); // Update when products change

  // Handle day toggle
  const toggleDay = (index: number, checked: boolean) => {
    setClosedDays(prev => ({ ...prev, [index]: checked }));
  };

  // Submit logic
  const submitForm = async () => {
    setSubmitting(true);
    setErrorToast(false);

    try {
      const sectionsData: any[] = [];
      
      if (formRef.current) {
        const sections = formRef.current.querySelectorAll('.section');
        
        sections.forEach(section => {
          const titleEl = section.querySelector('.section-title');
          const sectionTitle = titleEl ? titleEl.textContent?.trim() || 'Seção' : 'Seção';
          
          const fields: any[] = [];
          const processedNames = new Set<string>();

          // Find all inputs, selects, textareas
          const inputs = section.querySelectorAll('input, select, textarea');
          
          inputs.forEach((el) => {
            const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            const name = input.name;
            
            // Skip if no name, already processed, or is part of the hours table (handled separately)
            if (!name || processedNames.has(name) || name.startsWith('hora_') || name.startsWith('fechado_')) return;
            
            processedNames.add(name);

            let label = name; 
            let value: any = '';

            // Attempt to find a human-readable label
            const fieldParent = input.closest('.field');
            if (fieldParent) {
                // Try to find the main label of the field
                // Use :scope > label to get direct child label (main label)
                // If not supported or found, fallback to any label
                let mainLabel = fieldParent.querySelector('label');
                // If the first label is a wrapper for a checkbox (e.g. inside check-group), we might want the parent's previous sibling or similar.
                // But in our structure, .field > label is consistent for text inputs and groups.
                
                // For check-row/chip-check, the input is inside a label or div, but the Question is the .field > label.
                // We need to be careful not to grab the "Sim" label as the Question.
                
                // Iterate labels in fieldParent to find the one that is NOT a check-row label
                const labels = fieldParent.querySelectorAll('label');
                for (let i = 0; i < labels.length; i++) {
                    const l = labels[i];
                    if (!l.classList.contains('check-row') && !l.parentElement?.classList.contains('chip-check') && !l.parentElement?.classList.contains('check-row')) {
                        mainLabel = l;
                        break;
                    }
                }
                
                if (mainLabel) {
                    label = mainLabel.textContent || '';
                }
            }
            
            // Clean label
            label = label.replace('★', '').trim();
            if (!label) label = name; // Fallback

            // Get Value
            if (input.type === 'checkbox') {
                const groupInputs = section.querySelectorAll(`input[name="${name}"]`);
                
                if (groupInputs.length > 1) {
                    // Multi-value group (e.g. estilo_posicionamento)
                    const checkedArr = Array.from(groupInputs).filter((i: any) => i.checked).map((i: any) => i.value);
                    value = checkedArr.length ? checkedArr.join(', ') : 'Nenhum selecionado';
                } else {
                    // Single checkbox (e.g. canal_fisica)
                    // For these, the "Question" is often the label next to the checkbox if the main label is generic (like "Canais de Venda")
                    // But the user wants "Canais de Venda" -> "Loja Física: Sim", "WhatsApp: Não"?
                    // Or "Loja Física" -> "Sim".
                    
                    // In our HTML: <label class="check-row"><input name="canal_fisica"> <span>Loja física</span></label>
                    // The "Question" for this specific input is "Loja física".
                    const checkRow = input.closest('.check-row');
                    if (checkRow) {
                        const span = checkRow.querySelector('span');
                        if (span) label = span.textContent || label;
                    }
                    
                    value = input.checked ? 'Sim' : 'Não';
                }

            } else if (input.type === 'radio') {
                const checked = section.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement;
                value = checked ? checked.value : 'Não selecionado';
                
                // Ensure label is the main question, not the option label
                // Our label finding logic above should handle this (skipping chip-check labels)
            } else {
                value = input.value.trim() || 'Não preenchido';
            }

            fields.push({
                key: name,
                question: label,
                answer: value
            });
          });

          // Manual Hours Injection for Localização section
          if (sectionTitle.includes('Localização')) {
             const horariosLines: string[] = [];
             days.forEach((day, i) => {
                if (closedDays[i]) {
                    horariosLines.push(`${day}: Fechado`);
                } else {
                    const abInput = formRef.current?.querySelector(`[name=hora_abertura_${i}]`) as HTMLInputElement;
                    const feInput = formRef.current?.querySelector(`[name=hora_fechamento_${i}]`) as HTMLInputElement;
                    const ab = abInput?.value || '?';
                    const fe = feInput?.value || '?';
                    horariosLines.push(`${day}: ${ab} às ${fe}`);
                }
             });
             fields.push({
                 key: 'horario_funcionamento',
                 question: 'Horário de Funcionamento',
                 answer: horariosLines.join('\n')
             });
          }

          if (fields.length > 0) {
              sectionsData.push({
                  section: sectionTitle,
                  fields: fields
              });
          }
        });
      }

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      await fetch('https://n8n-n8n.gjvjfn.easypanel.host/webhook/formulariogb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            form_title: "Briefing GB Outlet",
            generated_at: new Date().toISOString(),
            sections: sectionsData
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (e) {
      console.error("Submission error:", e);
    } finally {
      setSubmitting(false);
      setSuccess(true);
    }
  };

  return (
    <>
      <div className="header">
        <div className="header-badge">Agente IA — GB Outlet</div>
        <h1>Briefing <span>Completo</span></h1>
        <p>Preencha as informações da sua loja para configurarmos o seu agente de IA personalizado.</p>
      </div>

      <div className="progress-wrap">
        <div className="progress-inner">
          <span className="progress-label">Progresso</span>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="progress-pct">{progress}%</span>
        </div>
      </div>

      <div className="main" ref={formRef} onInput={updateProgress}>
        {/* 1. IDENTIFICAÇÃO */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">1</div>
            <div>
              <div className="section-title">Identificação da Loja</div>
              <div className="section-subtitle">Dados básicos de contato e cadastro</div>
            </div>
          </div>

          <div className="field">
            <label><span className="star">★</span>Nome da Loja</label>
            <input type="text" name="nome_loja" placeholder="Ex: GB Outlet" />
          </div>
          <div className="field">
            <label><span className="star">★</span>Nome do Responsável / Proprietário</label>
            <input type="text" name="nome_responsavel" placeholder="Seu nome completo" />
          </div>
          <div className="grid-2">
            <div className="field">
              <label><span className="star">★</span>WhatsApp Principal</label>
              <input type="tel" name="whatsapp_principal" placeholder="(00) 00000-0000" />
            </div>
            <div className="field">
              <label>Outros WhatsApp</label>
              <input type="tel" name="whatsapp_outros" placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label><span className="star">★</span>Instagram</label>
              <input type="text" name="instagram" placeholder="@suaLoja" />
            </div>
            <div className="field">
              <label>Site / Linktree</label>
              <input type="text" name="site" placeholder="https://..." />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>E-mail comercial</label>
              <input type="email" name="email" placeholder="contato@loja.com" />
            </div>
            <div className="field">
              <label><span className="star">★</span>CNPJ ou CPF (MEI)</label>
              <input type="text" name="cnpj" placeholder="00.000.000/0000-00" />
            </div>
          </div>
        </div>

        {/* 2. IDENTIDADE DA LOJA */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">2</div>
            <div>
              <div className="section-title">Identidade da Loja</div>
              <div className="section-subtitle">Descrição, diferenciais e público-alvo</div>
            </div>
          </div>

          <div className="field">
            <label><span className="star">★</span>Descrição da Loja</label>
            <div className="field-hint">Como você descreveria sua loja para um cliente novo?</div>
            <textarea name="descricao_loja" placeholder="Ex: Somos uma loja de moda masculina premium focada em looks casuais e executivos..."></textarea>
          </div>
          <div className="field">
            <label><span className="star">★</span>Diferenciais e Proposta de Valor</label>
            <div className="field-hint">O que diferencia sua loja das concorrentes?</div>
            <textarea name="diferenciais" placeholder="Ex: curadoria de peças premium, consultoria de estilo, envio rápido..."></textarea>
          </div>

          <div className="grid-2">
            <div className="field">
              <label><span className="star">★</span>Faixa etária média dos clientes</label>
              <input type="text" name="faixa_etaria" placeholder="Ex: 25 a 45 anos" />
            </div>
            <div className="field">
              <label><span className="star">★</span>Perfil dos clientes</label>
              <input type="text" name="perfil_cliente" placeholder="Ex: Executivos, autônomos..." />
            </div>
          </div>
          <div className="field">
            <label>Outras características do cliente ideal</label>
            <textarea name="outras_caracteristicas_cliente" placeholder="Descreva hábitos, estilo de vida, etc." style={{ minHeight: '70px' }}></textarea>
          </div>

          <div className="field">
            <label>Posicionamento de Preço</label>
            <div className="inline-checks">
              {['Popular', 'Intermediário', 'Premium', 'Luxo'].map((val, i) => (
                <div className="chip-check" key={i}>
                  <input type="radio" name="preco_posicionamento" id={`preco${i + 1}`} value={val} />
                  <label htmlFor={`preco${i + 1}`}>{val}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Posicionamento de Estilo</label>
            <div className="inline-checks">
              {['Casual', 'Executivo', 'Esportivo', 'Social', 'Misto'].map((val, i) => (
                <div className="chip-check" key={i}>
                  <input type="checkbox" name="estilo_posicionamento" id={`estilo${i + 1}`} value={val} />
                  <label htmlFor={`estilo${i + 1}`}>{val}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. LOCALIZAÇÃO E CANAIS */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">3</div>
            <div>
              <div className="section-title">Localização e Canais de Atendimento</div>
              <div className="section-subtitle">Endereço, horários e onde vende</div>
            </div>
          </div>

          <div className="field">
            <label><span className="star">★</span>Endereço completo</label>
            <input type="text" name="endereco" placeholder="Rua, número, bairro, cidade, CEP" />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Ponto de referência</label>
              <input type="text" name="ponto_referencia" placeholder="Ex: próximo ao mercado X" />
            </div>
            <div className="field">
              <label>Link Google Maps</label>
              <input type="text" name="link_maps" placeholder="https://maps.google.com/..." />
            </div>
          </div>
          <div className="field">
            <label>Como chegar (descrição rápida)</label>
            <textarea name="como_chegar" placeholder="Ex: Siga a Av. Principal, vire à direita..." style={{ minHeight: '70px' }}></textarea>
          </div>

          <div className="field">
            <label>Estacionamento</label>
            <div className="inline-checks">
              {['Sim', 'Não', 'Nas proximidades'].map((val, i) => (
                <div className="chip-check" key={i}>
                  <input type="radio" name="estacionamento" id={`est${i + 1}`} value={val} />
                  <label htmlFor={`est${i + 1}`}>{val}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Horário de Funcionamento</label>
            <table className="hours-table">
              <thead><tr><th>Dia</th><th>Abertura</th><th>Fechamento</th><th>Fechado</th></tr></thead>
              <tbody>
                {days.map((day, i) => (
                  <tr key={i} style={{ opacity: closedDays[i] ? 0.4 : 1 }}>
                    <td>{day}</td>
                    <td><input type="time" name={`hora_abertura_${i}`} defaultValue={i < 5 ? '09:00' : (i === 5 ? '09:00' : '')} disabled={closedDays[i]} /></td>
                    <td><input type="time" name={`hora_fechamento_${i}`} defaultValue={i < 5 ? '18:00' : (i === 5 ? '14:00' : '')} disabled={closedDays[i]} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        name={`fechado_${i}`} 
                        id={`fechado_${i}`} 
                        checked={!!closedDays[i]} 
                        onChange={(e) => toggleDay(i, e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--gold)' }} 
                      />
                      <label htmlFor={`fechado_${i}`} style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '4px' }}>Fechado</label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="field">
            <label>Observações sobre horário</label>
            <textarea name="obs_horario" placeholder="Férias, feriados, datas especiais..." style={{ minHeight: '60px' }}></textarea>
          </div>

          <hr className="divider" />

          <div className="field">
            <label>Canais de Venda</label>
            <div className="check-group">
              {[
                { name: 'canal_fisica', label: 'Loja física' },
                { name: 'canal_whatsapp', label: 'WhatsApp' },
                { name: 'canal_ml', label: 'Mercado Livre' },
                { name: 'canal_shopee', label: 'Shopee' },
                { name: 'canal_magalu', label: 'Magalu' },
                { name: 'canal_site_proprio', label: 'Site próprio' },
                { name: 'canal_outro', label: 'Outro marketplace' },
              ].map((c, i) => (
                <label className="check-row" key={i}>
                  <input type="checkbox" name={c.name} value="Sim" /> <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Links dos Canais (preencha os que tiver)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" name="link_ml" placeholder="Link Mercado Livre" />
              <input type="text" name="link_shopee" placeholder="Link Shopee" />
              <input type="text" name="link_magalu" placeholder="Link Magalu" />
              <input type="text" name="link_site_proprio" placeholder="Link Site Próprio" />
              <input type="text" name="canal_outro_qual" placeholder="Outro canal — nome e link" />
            </div>
          </div>
        </div>

        {/* 4. PRODUTOS */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">4</div>
            <div>
              <div className="section-title">Produtos e Catálogo</div>
              <div className="section-subtitle">Itens vendidos, kits e tamanhos</div>
            </div>
          </div>

          <div>
            {products.map((prod) => (
              <div className="product-card" key={prod.id}>
                <div className="product-card-title">
                  Produto {prod.id} 
                  <button type="button" className="remove-btn" onClick={() => removeProduct(prod.id)}>×</button>
                </div>
                <div className="grid-2">
                  <div className="field" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px' }}>Nome do Produto</label>
                    <input type="text" name={`produto_${prod.id}_nome`} placeholder="Ex: Camiseta Básica" />
                  </div>
                  <div className="field" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px' }}>Preço (R$)</label>
                    <input type="text" name={`produto_${prod.id}_preco`} placeholder="Ex: 89,90" />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px' }}>Tamanhos Disponíveis</label>
                    <input type="text" name={`produto_${prod.id}_tamanhos`} placeholder="Ex: P, M, G, GG" />
                  </div>
                  <div className="field" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px' }}>Cores Disponíveis</label>
                    <input type="text" name={`produto_${prod.id}_cores`} placeholder="Ex: Preto, Branco, Navy" />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px' }}>Descrição / Observações</label>
                  <input type="text" name={`produto_${prod.id}_descricao`} placeholder="Material, estilo, destaque..." />
                </div>
              </div>
            ))}
          </div>
          
          <button type="button" className="add-btn" onClick={addProduct}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar produto
          </button>

          <hr className="divider" style={{ marginTop: '20px' }} />

          <div className="field" style={{ marginTop: '16px' }}>
            <label>Kits e Combos disponíveis</label>
            <div className="field-hint">Quais peças compõem, preço do kit e desconto em relação à compra separada</div>
            <textarea name="kits_combos" placeholder="Ex: Kit Casual — calça chino + camisa polo = R$199 (10% off separado)"></textarea>
          </div>

          <div className="field">
            <label>O que a loja NÃO vende</label>
            <div className="inline-checks" style={{ marginBottom: '8px' }}>
              {['Roupas infantis', 'Roupas femininas', 'Calçados', 'Acessórios', 'Roupas de academia'].map((val, i) => (
                <div className="chip-check" key={i}>
                  <input type="checkbox" name="nao_vende" id={`nv${i + 1}`} value={val} />
                  <label htmlFor={`nv${i + 1}`}>{val}</label>
                </div>
              ))}
            </div>
            <input type="text" name="nao_vende_outros" placeholder="Outros produtos que não oferece..." />
          </div>

          <div className="field">
            <label><span className="star">★</span>Guia de Tamanhos</label>
            <div className="field-hint">Como funciona o tamanho das peças? Inclua medidas (cm) se possível.</div>
            <textarea name="guia_tamanhos" placeholder="Ex: Nossas camisas seguem tabela padrão brasileira. Para oversized, recomendamos pedir um tamanho abaixo..."></textarea>
          </div>
        </div>

        {/* 5. PAGAMENTO */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">5</div>
            <div>
              <div className="section-title">Pagamento e Preços</div>
              <div className="section-subtitle">Formas aceitas, descontos e política de preços</div>
            </div>
          </div>

          <div className="field">
            <label>Formas de Pagamento Aceitas</label>
            <div className="check-group">
              {[
                'Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro (loja física)', 
                'Boleto bancário', 'Link de pagamento', 'Mercado Pago', 'PagSeguro'
              ].map((val, i) => (
                <label className="check-row" key={i}>
                  <input type="checkbox" name={`pag_${val.toLowerCase().replace(/ /g, '_').replace(/[()]/g, '')}`} value="Sim" /> 
                  <span>{val}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Chave Pix</label>
              <input type="text" name="chave_pix" placeholder="CPF, CNPJ, e-mail ou telefone" />
            </div>
            <div className="field">
              <label>Parcelas no crédito</label>
              <input type="text" name="parcelas_credito" placeholder="Ex: até 3x sem juros" />
            </div>
          </div>
          <div className="field">
            <label>Plataforma do link de pagamento</label>
            <input type="text" name="plataforma_link_pag" placeholder="Ex: Mercado Pago, PagSeguro..." />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Taxa para cartão de crédito?</label>
              <div className="inline-checks">
                <div className="chip-check"><input type="radio" name="taxa_cartao" id="tc1" value="Não" /><label htmlFor="tc1">Não</label></div>
                <div className="chip-check"><input type="radio" name="taxa_cartao" id="tc2" value="Sim" /><label htmlFor="tc2">Sim</label></div>
              </div>
              <input type="text" name="taxa_cartao_valor" placeholder="Qual %?" style={{ marginTop: '8px' }} />
            </div>
            <div className="field">
              <label>Desconto para Pix?</label>
              <div className="inline-checks">
                <div className="chip-check"><input type="radio" name="desconto_pix" id="dp1" value="Não" /><label htmlFor="dp1">Não</label></div>
                <div className="chip-check"><input type="radio" name="desconto_pix" id="dp2" value="Sim" /><label htmlFor="dp2">Sim</label></div>
              </div>
              <input type="text" name="desconto_pix_valor" placeholder="Qual %?" style={{ marginTop: '8px' }} />
            </div>
          </div>

          <div className="field">
            <label>Preços iguais no WhatsApp e loja física?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="precos_iguais" id="pi1" value="Sim" /><label htmlFor="pi1">Sim</label></div>
              <div className="chip-check"><input type="radio" name="precos_iguais" id="pi2" value="Não" /><label htmlFor="pi2">Não</label></div>
            </div>
            <input type="text" name="precos_diferenca" placeholder="Se não, qual a diferença?" style={{ marginTop: '8px' }} />
          </div>

          <div className="field">
            <label>Faz promoções frequentes?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="promocoes_frequentes" id="pf1" value="Não" /><label htmlFor="pf1">Não</label></div>
              <div className="chip-check"><input type="radio" name="promocoes_frequentes" id="pf2" value="Sim" /><label htmlFor="pf2">Sim</label></div>
            </div>
            <input type="text" name="promocoes_frequencia" placeholder="Com qual frequência?" style={{ marginTop: '8px' }} />
          </div>

          <div className="field">
            <label>Regras de desconto</label>
            <textarea name="regras_desconto" placeholder="Ex: Para compras acima de R$300 dou 10% de desconto..."></textarea>
          </div>
        </div>

        {/* 6. ENTREGAS */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">6</div>
            <div>
              <div className="section-title">Entregas e Frete</div>
              <div className="section-subtitle">Modalidades, taxas e prazos</div>
            </div>
          </div>

          <div className="field">
            <label>Modalidades de Entrega</label>
            <div className="check-group">
              {[
                { name: 'entrega_local', label: 'Entrega local (motoboy/entregador próprio)' },
                { name: 'entrega_correios', label: 'Correios (PAC / SEDEX)' },
                { name: 'entrega_transportadora', label: 'Transportadora' },
                { name: 'entrega_retirada', label: 'Retirada na loja' },
                { name: 'entrega_app', label: 'Aplicativo (iFood Envios, Rappi, etc.)' },
              ].map((c, i) => (
                <label className="check-row" key={i}>
                  <input type="checkbox" name={c.name} value="Sim" /> <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Transportadora / App de entrega (nome)</label>
            <input type="text" name="transportadora_nome" placeholder="Ex: Jadlog, iFood Envios..." />
          </div>

          <hr className="divider" />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>Entrega Local</p>

          <div className="field">
            <label>Bairros / regiões atendidas</label>
            <input type="text" name="bairros_entrega" placeholder="Ex: Centro, Zona Norte, toda a cidade..." />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Taxa de entrega local</label>
              <input type="text" name="taxa_entrega_local" placeholder="R$" />
            </div>
            <div className="field">
              <label>Frete grátis local a partir de</label>
              <input type="text" name="frete_gratis_local" placeholder="R$ ou 'Não tem'" />
            </div>
          </div>
          <div className="field">
            <label>Prazo de entrega local</label>
            <input type="text" name="prazo_entrega_local" placeholder="Ex: mesmo dia, até 2h..." />
          </div>

          <hr className="divider" />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>Envio Nacional</p>

          <div className="grid-2">
            <div className="field">
              <label>Prazo PAC</label>
              <input type="text" name="prazo_pac" placeholder="Ex: 5 a 10 dias úteis" />
            </div>
            <div className="field">
              <label>Prazo SEDEX</label>
              <input type="text" name="prazo_sedex" placeholder="Ex: 1 a 3 dias úteis" />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Frete grátis nacional a partir de</label>
              <input type="text" name="frete_gratis_nacional" placeholder="R$ ou 'Não tem'" />
            </div>
            <div className="field">
              <label>Informa rastreamento?</label>
              <div className="inline-checks" style={{ marginTop: '8px' }}>
                <div className="chip-check"><input type="radio" name="rastreamento" id="r1" value="Sim" /><label htmlFor="r1">Sim</label></div>
                <div className="chip-check"><input type="radio" name="rastreamento" id="r2" value="Não" /><label htmlFor="r2">Não</label></div>
              </div>
            </div>
          </div>
          <div className="field">
            <label>Observações sobre envio</label>
            <textarea name="obs_envio" placeholder="Quem calcula frete, como enviar link de pagamento do frete, etc." style={{ minHeight: '70px' }}></textarea>
          </div>
        </div>

        {/* 7. TROCAS */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">7</div>
            <div>
              <div className="section-title">Política de Trocas e Devoluções</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Aceita troca?</label>
              <div className="inline-checks">
                <div className="chip-check"><input type="radio" name="aceita_troca" id="at1" value="Sim" /><label htmlFor="at1">Sim</label></div>
                <div className="chip-check"><input type="radio" name="aceita_troca" id="at2" value="Não" /><label htmlFor="at2">Não</label></div>
              </div>
            </div>
            <div className="field">
              <label>Prazo para solicitar troca</label>
              <input type="text" name="prazo_troca" placeholder="Ex: 7 dias após recebimento" />
            </div>
          </div>
          <div className="field">
            <label>Condição da peça para aceitar troca</label>
            <input type="text" name="condicao_troca" placeholder="Ex: Com etiqueta, sem uso..." />
          </div>
          <div className="field">
            <label>Quem paga o frete de devolução?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="frete_devolucao" id="fd1" value="Loja" /><label htmlFor="fd1">Loja</label></div>
              <div className="chip-check"><input type="radio" name="frete_devolucao" id="fd2" value="Cliente" /><label htmlFor="fd2">Cliente</label></div>
              <div className="chip-check"><input type="radio" name="frete_devolucao" id="fd3" value="Depende do caso" /><label htmlFor="fd3">Depende</label></div>
            </div>
          </div>
          <div className="field">
            <label>Processo de troca (passo a passo)</label>
            <textarea name="processo_troca" placeholder="Descreva como o cliente deve proceder..."></textarea>
          </div>

          <hr className="divider" />

          <div className="field">
            <label>Faz reembolso em dinheiro?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="reembolso_dinheiro" id="rd1" value="Sim" /><label htmlFor="rd1">Sim</label></div>
              <div className="chip-check"><input type="radio" name="reembolso_dinheiro" id="rd2" value="Não, apenas crédito" /><label htmlFor="rd2">Não, apenas crédito</label></div>
            </div>
          </div>
          <div className="field">
            <label>Exceções na política de devolução</label>
            <textarea name="excecoes_devolucao" placeholder="Casos especiais..." style={{ minHeight: '70px' }}></textarea>
          </div>
        </div>

        {/* 8. ATENDIMENTO */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">8</div>
            <div>
              <div className="section-title">Roteiro de Atendimento</div>
              <div className="section-subtitle">Como o agente deve se comunicar e responder</div>
            </div>
          </div>

          <div className="field">
            <label><span className="star">★</span>Mensagem de boas-vindas (como o agente deve se apresentar)</label>
            <textarea name="boas_vindas" placeholder="Ex: Oi! Aqui é a GB Outlet, moda masculina premium. Tudo bem? Com quem tenho o prazer? 😊"></textarea>
          </div>

          <div className="field">
            <label>O agente deve pedir o nome do cliente?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="pedir_nome" id="pn1" value="Sim" /><label htmlFor="pn1">Sim</label></div>
              <div className="chip-check"><input type="radio" name="pedir_nome" id="pn2" value="Não" /><label htmlFor="pn2">Não</label></div>
            </div>
          </div>

          <div className="field">
            <label>Tom de voz</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="tom_voz" id="tv1" value="Formal" /><label htmlFor="tv1">Formal</label></div>
              <div className="chip-check"><input type="radio" name="tom_voz" id="tv2" value="Informal/Descontraído" /><label htmlFor="tv2">Informal</label></div>
              <div className="chip-check"><input type="radio" name="tom_voz" id="tv3" value="Muito informal (gírias ok)" /><label htmlFor="tv3">Bem informal</label></div>
              <div className="chip-check"><input type="radio" name="tom_voz" id="tv4" value="Neutro" /><label htmlFor="tv4">Neutro</label></div>
            </div>
          </div>
          <div className="field">
            <label>Uso de emojis</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="emojis" id="em1" value="Bastante" /><label htmlFor="em1">Bastante</label></div>
              <div className="chip-check"><input type="radio" name="emojis" id="em2" value="Com moderação" /><label htmlFor="em2">Moderação</label></div>
              <div className="chip-check"><input type="radio" name="emojis" id="em3" value="Raramente" /><label htmlFor="em3">Raramente</label></div>
              <div className="chip-check"><input type="radio" name="emojis" id="em4" value="Não" /><label htmlFor="em4">Não</label></div>
            </div>
          </div>

          <hr className="divider" />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>Modelos de Resposta do Agente</p>

          <div>
            {faqs.map((faq, i) => (
              <div className="field" key={i}>
                <label>{faq.label}</label>
                <textarea name={faq.key} placeholder={faq.placeholder} style={{ minHeight: '70px' }}></textarea>
              </div>
            ))}
          </div>
        </div>

        {/* 9. ESCALONAMENTO */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">9</div>
            <div>
              <div className="section-title">Escalonamento para Humano</div>
              <div className="section-subtitle">Quando e como chamar um atendente</div>
            </div>
          </div>

          <div className="field">
            <label>Situações que DEVEM ir para humano</label>
            <div className="check-group">
              {[
                { name: 'esc_frete', label: 'Pergunta sobre valor exato do frete' },
                { name: 'esc_semestoque', label: 'Produto fora de estoque' },
                { name: 'esc_detalhes', label: 'Muitos detalhes técnicos do produto' },
                { name: 'esc_reclamacao', label: 'Reclamação ou insatisfação' },
                { name: 'esc_negociacao', label: 'Cliente quer negociar preço' },
                { name: 'esc_atacado', label: 'Venda no atacado' },
                { name: 'esc_consultoria', label: 'Consultoria de look/estilo' },
                { name: 'esc_troca', label: 'Dúvida sobre troca/devolução' },
                { name: 'esc_pag_diferente', label: 'Pagamento diferente do padrão' },
              ].map((c, i) => (
                <label className="check-row" key={i}>
                  <input type="checkbox" name={c.name} value="Sim" /> <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Pedido grande — acima de quantas peças?</label>
              <input type="text" name="esc_pedido_grande_qtd" placeholder="Ex: 5 peças" />
            </div>
            <div className="field">
              <label>Outras situações</label>
              <input type="text" name="esc_outras" placeholder="Descreva..." />
            </div>
          </div>

          <hr className="divider" />

          <div className="field">
            <label><span className="star">★</span>Contato para acionar o humano</label>
            <input type="tel" name="contato_humano" placeholder="WhatsApp / CRM / outro" />
          </div>
          <div className="field">
            <label>Como prefere ser notificado?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="notificacao_humano" id="nh1" value="Mensagem no WhatsApp" /><label htmlFor="nh1">WhatsApp</label></div>
              <div className="chip-check"><input type="radio" name="notificacao_humano" id="nh2" value="Sistema de CRM" /><label htmlFor="nh2">CRM</label></div>
              <div className="chip-check"><input type="radio" name="notificacao_humano" id="nh3" value="Outro" /><label htmlFor="nh3">Outro</label></div>
            </div>
          </div>
          <div className="field">
            <label>Mensagem ao cliente ao transferir para humano</label>
            <textarea name="msg_transferencia" placeholder="Ex: Vou chamar um especialista da nossa equipe! Um momento 😊" style={{ minHeight: '70px' }}></textarea>
          </div>

          <hr className="divider" />

          <div className="field">
            <label>Dias/horários com humano disponível</label>
            <input type="text" name="horario_humano" placeholder="Ex: Seg–Sex das 9h às 18h" />
          </div>
          <div className="field">
            <label>O que o agente diz fora do horário de atendimento?</label>
            <textarea name="msg_fora_horario" placeholder="Ex: Nosso time está offline agora. Retornaremos amanhã às 9h!" style={{ minHeight: '70px' }}></textarea>
          </div>
        </div>

        {/* 10. IDENTIDADE DO AGENTE */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">10</div>
            <div>
              <div className="section-title">Identidade e Personalidade do Agente</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label><span className="star">★</span>O agente terá nome?</label>
              <div className="inline-checks">
                <div className="chip-check"><input type="radio" name="agente_tem_nome" id="an1" value="Sim" /><label htmlFor="an1">Sim</label></div>
                <div className="chip-check"><input type="radio" name="agente_tem_nome" id="an2" value="Não" /><label htmlFor="an2">Não (usa nome da loja)</label></div>
              </div>
              <input type="text" name="agente_nome" placeholder="Nome do agente" style={{ marginTop: '8px' }} />
            </div>
            <div className="field">
              <label>Gênero do agente</label>
              <div className="inline-checks" style={{ marginTop: '8px' }}>
                <div className="chip-check"><input type="radio" name="agente_genero" id="ag1" value="Masculino" /><label htmlFor="ag1">Masculino</label></div>
                <div className="chip-check"><input type="radio" name="agente_genero" id="ag2" value="Feminino" /><label htmlFor="ag2">Feminino</label></div>
                <div className="chip-check"><input type="radio" name="agente_genero" id="ag3" value="Neutro" /><label htmlFor="ag3">Neutro</label></div>
              </div>
            </div>
          </div>
          <div className="field">
            <label>Personalidade do agente</label>
            <textarea name="agente_personalidade" placeholder="Ex: É descontraído, fala com o cliente de igual para igual, usa gírias leves, é proativo em sugerir produtos..."></textarea>
          </div>

          <hr className="divider" />

          <div className="field">
            <label><span className="star">★</span>Nível de formalidade</label>
            <div className="inline-checks">
              {['Muito formal', 'Formal', 'Intermediário', 'Informal', 'Bem informal'].map((val, i) => (
                <div className="chip-check" key={i}>
                  <input type="radio" name="formalidade" id={`fo${i + 1}`} value={val} />
                  <label htmlFor={`fo${i + 1}`}>{val}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Usa "você" ou "tu"?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="voce_tu" id="vt1" value="você" /><label htmlFor="vt1">você</label></div>
              <div className="chip-check"><input type="radio" name="voce_tu" id="vt2" value="tu" /><label htmlFor="vt2">tu</label></div>
            </div>
          </div>
          <div className="field">
            <label>Palavras/expressões que o agente DEVE usar</label>
            <textarea name="vocab_deve" placeholder="Vocabulário da marca, slogans, expressões características..." style={{ minHeight: '70px' }}></textarea>
          </div>
          <div className="field">
            <label>Palavras/expressões que o agente NUNCA deve usar</label>
            <textarea name="vocab_nunca" placeholder="Termos proibidos, concorrentes, etc." style={{ minHeight: '70px' }}></textarea>
          </div>
          <div className="field">
            <label>Exemplos de mensagens que você já usa e o agente deve replicar</label>
            <textarea name="exemplos_mensagens" placeholder="Cole aqui mensagens que você já envia hoje..."></textarea>
          </div>
        </div>

        {/* 11. VENDAS ATIVAS */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">11</div>
            <div>
              <div className="section-title">Vendas Ativas e Pós-Venda</div>
              <div className="section-subtitle">Promoções, follow-up e satisfação</div>
            </div>
          </div>

          <div className="field">
            <label>Promoções recorrentes</label>
            <textarea name="promocoes_recorrentes" placeholder="Ex: Todo mês tem queima de estoque, Black Friday anual..." style={{ minHeight: '70px' }}></textarea>
          </div>

          <hr className="divider" />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>Follow-up</p>

          <div className="field">
            <label>Agente deve fazer follow-up com clientes que não finalizaram?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="followup_ativo" id="fa1" value="Sim" /><label htmlFor="fa1">Sim</label></div>
              <div className="chip-check"><input type="radio" name="followup_ativo" id="fa2" value="Não" /><label htmlFor="fa2">Não</label></div>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Após quanto tempo?</label>
              <div className="inline-checks">
                {['2h', '4h', '24h', '48h'].map((val, i) => (
                  <div className="chip-check" key={i}>
                    <input type="radio" name="followup_tempo" id={`ft${i + 1}`} value={val} />
                    <label htmlFor={`ft${i + 1}`}>{val}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Quantas tentativas?</label>
              <div className="inline-checks">
                {['1', '2', '3'].map((val, i) => (
                  <div className="chip-check" key={i}>
                    <input type="radio" name="followup_tentativas" id={`ftt${i + 1}`} value={val} />
                    <label htmlFor={`ftt${i + 1}`}>{val}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label>Modelo de mensagem de follow-up</label>
            <textarea name="msg_followup" placeholder="Ex: Oi [Nome]! Ficamos te esperando! Os produtos ainda estão disponíveis 😊"></textarea>
          </div>

          <hr className="divider" />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>Pós-venda</p>

          <div className="field">
            <label>Agente envia mensagem após entrega?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="msg_posvenda_ativo" id="mp1" value="Sim" /><label htmlFor="mp1">Sim</label></div>
              <div className="chip-check"><input type="radio" name="msg_posvenda_ativo" id="mp2" value="Não" /><label htmlFor="mp2">Não</label></div>
            </div>
          </div>
          <div className="field">
            <label>Modelo de mensagem de pós-venda</label>
            <textarea name="msg_posvenda" placeholder="Ex: Oi [Nome]! Seu pedido chegou bem? Ficamos felizes em te atender! 🙌"></textarea>
          </div>
          <div className="field">
            <label>Solicitar avaliação/feedback?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="solicitar_avaliacao" id="sa1" value="Sim" /><label htmlFor="sa1">Sim</label></div>
              <div className="chip-check"><input type="radio" name="solicitar_avaliacao" id="sa2" value="Não" /><label htmlFor="sa2">Não</label></div>
            </div>
            <input type="text" name="avaliacao_onde" placeholder="Onde? (Google, Instagram, etc.)" style={{ marginTop: '8px' }} />
          </div>
        </div>

        {/* 12. INFORMAÇÕES EXTRAS */}
        <div className="section">
          <div className="section-header">
            <div className="section-num">12</div>
            <div>
              <div className="section-title">Informações Complementares</div>
            </div>
          </div>

          <div className="field">
            <label>Principais concorrentes (o agente nunca deve mencionar)</label>
            <textarea name="concorrentes" placeholder="Liste os concorrentes para que o agente saiba evitar..." style={{ minHeight: '70px' }}></textarea>
          </div>
          <div className="field">
            <label>Parcerias, programa de indicação, influenciadores</label>
            <textarea name="parcerias" placeholder="O agente pode mencionar isso?" style={{ minHeight: '70px' }}></textarea>
          </div>
          <div className="field">
            <label>O agente pode enviar o cliente para o Instagram?</label>
            <div className="inline-checks">
              <div className="chip-check"><input type="radio" name="divulgar_instagram" id="di1" value="Sim" /><label htmlFor="di1">Sim</label></div>
              <div className="chip-check"><input type="radio" name="divulgar_instagram" id="di2" value="Não" /><label htmlFor="di2">Não</label></div>
            </div>
          </div>
          <div className="field">
            <label>Outras redes sociais que o agente pode divulgar</label>
            <input type="text" name="outras_redes" placeholder="TikTok, YouTube, Telegram..." />
          </div>
          <div className="field">
            <label>Situações especiais (clientes VIP, cupons, lista de espera)</label>
            <textarea name="situacoes_especiais" placeholder="Ex: Clientes VIP recebem desconto de 15%, cupom WELCOME10 para novos clientes..." ></textarea>
          </div>
          <div className="field">
            <label>O que o agente NUNCA deve fazer</label>
            <textarea name="agente_nunca" placeholder="Ex: nunca revelar custo das peças, não prometer prazos que não pode cumprir, não falar de política..."></textarea>
          </div>
          <div className="field">
            <label>Outras informações importantes</label>
            <textarea name="outras_infos" placeholder="Qualquer informação adicional que não foi coberta acima..."></textarea>
          </div>
        </div>
      </div>

      {/* SUBMIT */}
      <div className="submit-area">
        <div className="submit-inner">
          <button className="submit-btn" onClick={submitForm} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar Briefing'}
          </button>
        </div>
      </div>

      {/* SUCCESS */}
      <div className={`success-overlay ${success ? 'show' : ''}`}>
        <div className="success-icon">✓</div>
        <div className="success-title">Briefing enviado!</div>
        <p className="success-desc">Recebemos todas as informações. Em breve nossa equipe entrará em contato para configurar o seu agente de IA personalizado. 🚀</p>
      </div>

      {/* TOAST */}
      <div className={`toast ${errorToast ? 'show' : ''}`}>Erro ao enviar. Tente novamente.</div>
    </>
  );
}
