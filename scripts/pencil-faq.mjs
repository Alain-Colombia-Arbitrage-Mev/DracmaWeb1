const attributes = node => Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
const set = (node, name, value) => {
  node.attrs ||= [];
  const attr = node.attrs.find(a => a.name === name);
  if (attr) attr.value = value;
  else node.attrs.push({ name, value });
};
const addClass = (node, value) => set(node, 'class', [...new Set(`${attributes(node).class || ''} ${value}`.trim().split(/\s+/))].join(' '));
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join(' ').replace(/\s+/g, ' ').trim();

const answers = {
  '¿La comisión cambia según el tipo de cambio?': 'La comisión por destino y el tipo de cambio se muestran por separado. Los valores de esta calculadora son ejemplos y no una cotización ejecutable.',
  '¿Cuánto tarda en llegar?': 'La disponibilidad y los tiempos se confirman antes de enviar. Esta página ilustra el servicio; no realiza transferencias.',
  '¿Cómo puedo pagar el envío?': 'El diseño contempla transferencia bancaria o saldo dracma. Las opciones disponibles se mostrarán cuando el servicio esté habilitado.',
  '¿Por qué hay un mínimo por envío?': 'El cálculo ilustrativo aplica el mayor entre el porcentaje del destino y su comisión mínima. Puedes probar distintos importes en el simulador.',
  '¿Está regulado?': 'El proveedor y las condiciones aplicables deben identificarse antes de contratar el servicio. Consulta su disponibilidad desde Empezar.',
};
const fallback = 'Revisa las condiciones específicas del producto y sus riesgos antes de participar. Desde Empezar puedes elegir el tema que te interesa. Esta vista no ejecuta operaciones financieras.';

// Exported design layers are fixed-height divs. Emit native disclosures before
// publishing so answers participate in document flow even without JavaScript.
export function normalizePencilFaq(root) {
  let count = 0;
  const visit = node => {
    if (node.tagName === 'div' && attributes(node)['data-pencil-name'] === 'details') {
      const summary = node.childNodes.find(n => attributes(n)['data-pencil-name'] === 'summary');
      if (!summary) throw new Error('FAQ item is missing its question');
      const elements = summary.childNodes.filter(n => n.tagName);
      const question = elements[0];
      const indicator = elements.at(-1);
      const authoredAnswer = node.childNodes.filter(n => n !== summary && (n.tagName || text(n)));

      node.tagName = node.nodeName = 'details';
      summary.tagName = summary.nodeName = 'summary';
      addClass(node, 'pencil-faq-item');
      addClass(summary, 'pencil-faq-summary');
      addClass(question, 'pencil-faq-question');
      addClass(indicator, 'pencil-faq-indicator');
      set(indicator, 'aria-hidden', 'true');
      indicator.childNodes = [];
      if (authoredAnswer.length) set(node, 'open', '');

      const answer = {
        nodeName: 'div', tagName: 'div',
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        attrs: [{ name: 'class', value: 'pencil-faq-answer' }],
        childNodes: authoredAnswer.length ? authoredAnswer : [{ nodeName: '#text', value: answers[text(question)] || fallback }],
        parentNode: node,
      };
      for (const child of answer.childNodes) child.parentNode = answer;
      node.childNodes = [summary, answer];
      addClass(node.parentNode, 'pencil-faq-list');
      count++;
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(root);
  return count;
}
