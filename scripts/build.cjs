// Render editable content before delivery and keep the root homepage redirect-free.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const data = vm.runInNewContext(read('js/content.js') + '\nsiteContent;');
const code = read('js/index.js');
const icons = vm.runInNewContext(code.slice(code.indexOf('const icons ='), code.indexOf('const element =')) + '\nicons;');
const image = (src, alt, width, height) => `<img src="${escape(src)}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async">`;
const content = {
  services: data.services.map((service, index) => `<article class="service-card"><div class="service-top"><span class="service-icon"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${icons[service.icon] || icons.website}</svg></span><span class="card-number">0${index + 1}</span></div><h3>${escape(service.title)}</h3><p>${escape(service.description)}</p><p class="service-detail">${escape(service.detail)}</p></article>`).join('\n'),
  portfolio: data.projects.map(project => {
    let live = '';
    try { const url = new URL(project.url); if (['http:', 'https:'].includes(url.protocol)) live = `<a class="inline-link" href="${escape(url.href)}">Visit website &#8599;</a>`; } catch {}
    return `<article class="project-card"><div class="project-media">${image(project.image, project.imageAlt, project.imageWidth || 800, project.imageHeight || 500)}${project.image.includes('/placeholders/') ? '<span class="placeholder-label">PROJECT PLACEHOLDER</span>' : ''}<a class="project-view-button" href="${escape(project.page)}" aria-label="View project: ${escape(project.title)}">View project</a></div><div class="project-body"><h3>${escape(project.title)}</h3><p>${escape(project.description)}</p>${project.work ? `<p class="project-work">${escape(project.work)}</p>` : ''}${project.services?.length ? `<p class="project-work">${escape(project.services.join(' / '))}</p>` : ''}${live}</div></article>`;
  }).join('\n'),
  team: data.team.map(member => `<article class="team-card"><a class="team-image" href="${escape(member.image)}" aria-label="View full-size photo of ${escape(member.name)}">${image(member.image, `Portrait of ${member.name}`, 400, 400)}</a><div><h3>${escape(member.name)}</h3><p class="team-role">${escape(member.role)}</p><p>${escape(member.description)}</p></div></article>`).join('\n')
};
let home = read('html/index.html');
for (const [name, markup] of Object.entries(content)) {
  const start = `<!-- static:${name}:start -->`, end = `<!-- static:${name}:end -->`;
  const block = `${start}\n${markup}\n${end}`;
  if (home.includes(start)) home = home.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => block);
  else {
    const pattern = new RegExp(`(<div[^>]*id="${name}-grid"[^>]*>)\\s*(</div>)`);
    if (!pattern.test(home)) throw new Error(`Cannot locate ${name} grid`);
    home = home.replace(pattern, (_, open, close) => `${open}\n${block}\n${close}`);
  }
}
fs.writeFileSync(path.join(root, 'html/index.html'), home);
fs.writeFileSync(path.join(root, 'index.html'), home);
console.log('Rendered homepage content and synchronized root index.html.');
