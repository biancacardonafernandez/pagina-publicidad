// Interacciones principales: menú, filtros, reveal, progreso y validación
document.addEventListener('DOMContentLoaded',function(){
  // Mobile menu
  const burger = document.getElementById('burger');
  const nav = document.getElementById('navLinks');
  burger && burger.addEventListener('click', ()=>{
    nav.classList.toggle('open');
    burger.classList.toggle('open');
    burger.setAttribute('aria-expanded', nav.classList.contains('open'));
  });
  nav && nav.querySelectorAll('a').forEach(link=>link.addEventListener('click', ()=>{
    nav.classList.remove('open');
    burger && burger.classList.remove('open');
    burger && burger.setAttribute('aria-expanded', 'false');
  }));

  // Project modal functionality
  const projectData = {
    1:{title:'Campaña integral',image:'https://i.pinimg.com/736x/a6/28/0c/a6280cd98d4304d7d7fe69f61c9dda4c.jpg',category:'Publicidad',goal:'Crear una campaña integral y coherente en múltiples canales.',concept:'Propuesta visual moderna, atractiva y estratégica.',contribution:'Diseño conceptual, estrategia visual y producción de piezas.'},
    2:{title:'Campaña seasonal',image:'https://i.pinimg.com/1200x/de/40/2f/de402f1d38028464a895a9c9eaaada9e.jpg',category:'Publicidad',goal:'Captar atención con una propuesta temática impactante.',concept:'Diseño festivo e inmediato con paleta distintiva.',contribution:'Concepto creativo y adaptación de recursos visuales.'},
    3:{title:'Estrategia de contenido',image:'https://i.pinimg.com/736x/cd/a8/06/cda806e2ffdf40916c04f6af5d617c44.jpg',category:'Redes sociales',goal:'Aumentar engagement y alcance en plataformas digitales.',concept:'Contenido visual estratégico y calendario editorial.',contribution:'Creación de piezas, planificación y community management.'},
    4:{title:'Sistema de marca',image:'https://i.pinimg.com/736x/a9/8a/f7/a98af7b7b08bf90f1438cdcf7ca3f6cb.jpg',category:'Branding',goal:'Desarrollar una identidad visual sólida y reconocible.',concept:'Sistema gráfico coherente y versátil.',contribution:'Desarrollo de manual, guía de marca y recursos visuales.'},
    5:{title:'Colaboración influencers',image:'https://i.pinimg.com/1200x/39/42/99/39429970a729a2e74a7c1fe50bdb5164.jpg',category:'Redes sociales',goal:'Posicionar marca mediante alcance de personalidades digitales.',concept:'Estrategia colaborativa y contenido auténtico.',contribution:'Coordinación de proyecto, diseño y gestión de colaboraciones.'},
    6:{title:'Aplicación de marca',image:'https://i.pinimg.com/736x/f5/e6/9d/f5e69d1dad12d6a366767efed602e1b0.jpg',category:'Diseño',goal:'Materializar la identidad en todos los soportes.',concept:'Aplicación coherente en packaging, digital y físico.',contribution:'Diseño de aplicaciones y supervisión de producción.'},
    7:{title:'Rediseño corporativo',image:'https://i.pinimg.com/736x/62/e0/32/62e03262ea4dee4031c4ed0d00a447cc.jpg',category:'Branding',goal:'Modernizar y actualizar la identidad existente.',concept:'Evolución visual manteniendo valores corporativos.',contribution:'Análisis, concepto rediseñado y guía de transición.'},
    8:{title:'Packaging innovador',image:'https://i.pinimg.com/1200x/a0/3c/89/a03c89075db65d8d5ba481dceb82ecba.jpg',category:'Diseño',goal:'Crear packaging que destaque en punto de venta.',concept:'Solución creativa, funcional y sostenible.',contribution:'Concepto, diseño 3D y especificaciones técnicas.'}
  };
  
  const modal = document.getElementById('projectModal');
  const modalClose = document.getElementById('modalClose');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const projectTriggers = document.querySelectorAll('.project-trigger');
  
  function openModal(projectId){
    const data = projectData[projectId];
    if(!data) return;
    document.getElementById('modalImage').src = data.image;
    document.getElementById('modalTitle').textContent = data.title;
    document.getElementById('modalCategory').textContent = data.category;
    document.getElementById('modalGoal').textContent = data.goal;
    document.getElementById('modalConcept').textContent = data.concept;
    document.getElementById('modalContribution').textContent = data.contribution;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }
  
  function closeModal(){
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  
  projectTriggers.forEach(trigger=>{
    trigger.addEventListener('click', ()=>{
      const projectId = trigger.closest('.project').dataset.project;
      openModal(projectId);
    });
  });
  
  modalClose && modalClose.addEventListener('click', closeModal);
  modalBackdrop && modalBackdrop.addEventListener('click', closeModal);
  
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false'){
      closeModal();
    }
  });
  const filters = Array.from(document.querySelectorAll('.filter'));
  const projects = Array.from(document.querySelectorAll('.project'));
  filters.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      filters.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      projects.forEach(p=>{
        const cat = p.dataset.category;
        p.style.display = (f==='all' || cat.split(' ').includes(f)) ? '' : 'none';
      });
    });
  });

  // Reveal on scroll
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add('visible');
    });
  },{threshold:0.12});
  document.querySelectorAll('.card, .project, .step, .hero-content, .cta-box').forEach(el=>{el.classList.add('reveal');io.observe(el)});

  // Animate project progress
  const prog = document.querySelector('.progress');
  if(prog){
    const fill = prog.querySelector('.progress-fill');
    const target = parseInt(prog.dataset.progress,10) || 0;
    setTimeout(()=>{fill.style.width = target + '%'; document.getElementById('progressPercent').textContent = target + '%';},300);
  }

  // Simple form validation + demo submit
  const form = document.getElementById('adviceForm');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const requiredFields = Array.from(form.querySelectorAll('[required]'));
      const invalid = requiredFields.filter(i=>!i.value.trim() || (i.type === 'email' && !i.validity.valid));
      requiredFields.forEach(i=>i.classList.toggle('error', invalid.includes(i)));
      const status = document.getElementById('formStatus');
      if(invalid.length){
        status.textContent = 'Revisa los campos marcados antes de continuar.';
        return;
      }
      status.textContent = 'Solicitud preparada. Conecta este formulario a un servicio de envío para recibirla realmente.';
      form.reset();
      requiredFields.forEach(i=>i.classList.remove('error'));
    });
    form.querySelectorAll('input, textarea, select').forEach(field=>field.addEventListener('input', ()=>field.classList.remove('error')));
  }
});
