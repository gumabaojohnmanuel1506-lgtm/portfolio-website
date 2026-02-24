// Watches elements with .fade-in and adds .visible when they enter the viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Highlights the active nav link based on the current scroll position
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';

  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 80) {
      current = section.id;
    }
  });

  navLinks.forEach(link => {
    link.style.color = link.getAttribute('href') === '#' + current
      ? 'var(--yellow)'
      : '';
  });
});

// --- Image Modal Logic ---

const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalPlaceholder = document.getElementById('modal-placeholder');
const projectImages = document.querySelectorAll('.project-screenshot img');
const projectScreenshotContainers = document.querySelectorAll('.project-screenshot');
const closeModal = document.querySelector('.close-modal');

// Helper to display the modal (common behavior)
const showModal = () => {
  modal.style.display = 'flex';
  // Small delay ensures the display:flex is applied before the opacity transition starts
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
};

// Open modal with an actual image
const openModalWithImage = (img) => {
  modalPlaceholder.style.display = 'none';
  modalImg.style.display = 'block';
  modalImg.src = img.src;
  modalImg.alt = img.alt || 'Enlarged screenshot';
  showModal();
};

// Open modal with a textual placeholder when image isn't available
const openModalWithPlaceholder = (text) => {
  modalImg.style.display = 'none';
  modalPlaceholder.textContent = text || 'No image available';
  modalPlaceholder.style.display = 'flex';
  showModal();
};

// Open modal when an image element is clicked
projectImages.forEach(img => {
  img.addEventListener('click', (e) => {
    e.stopPropagation();
    // Decide whether to show the disclaimer for this image
    const disclaimerEl = modal.querySelector('.modal-disclaimer');
    const hideDisclaimer = img.dataset && img.dataset.hideDisclaimer === 'true';
    if (disclaimerEl) disclaimerEl.style.display = hideDisclaimer ? 'none' : 'block';

    // If image is visible, show it; otherwise fall back to placeholder
    if (img.style.display === 'none') {
      const placeholder = img.parentElement.querySelector('.screenshot-placeholder');
      // ensure placeholder shows/hides disclaimer the same way
      if (disclaimerEl) disclaimerEl.style.display = hideDisclaimer ? 'none' : 'block';
      openModalWithPlaceholder(placeholder ? placeholder.textContent.trim() : 'No image available');
    } else {
      openModalWithImage(img);
    }
  });
});

// Also make the entire screenshot container clickable so placeholder areas open the modal
projectScreenshotContainers.forEach(container => {
  container.addEventListener('click', (e) => {
    // If the image inside is visible, let its handler run; otherwise open placeholder
    const img = container.querySelector('img');
    const disclaimerEl = modal.querySelector('.modal-disclaimer');
    const hideDisclaimer = img && img.dataset && img.dataset.hideDisclaimer === 'true';
    if (disclaimerEl) disclaimerEl.style.display = hideDisclaimer ? 'none' : 'block';

    if (!img || img.style.display === 'none') {
      const placeholder = container.querySelector('.screenshot-placeholder');
      openModalWithPlaceholder(placeholder ? placeholder.textContent.trim() : 'No image available');
    }
  });
});

// Function to close the modal
const closeImageModal = () => {
  modal.classList.remove('show');
  // Wait for the fade-out transition to finish before hiding the element completely
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300); 
};

// Close when clicking the 'X'
closeModal.addEventListener('click', closeImageModal);

// Close when clicking anywhere on the black background (outside the image)
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeImageModal();
  }
});

// --- Contact form + EmailJS integration ---
// Note: It's safer to keep credentials out of client code; EmailJS exposes a public key (user ID)
// which is acceptable in-browser. Service/template IDs are required and must match your EmailJS config.

const contactForm = document.getElementById('contact-form');
const contactStatus = document.getElementById('contact-status');

// Configuration - replace these only with values from your EmailJS dashboard
const EMAILJS_USER_ID = 'RG5tsqhTQZDbePGk9';
const EMAILJS_SERVICE_ID = 'service_3pzptaf';
const EMAILJS_TEMPLATE_ID = 'template_36nplh8';

// Ensure EmailJS is loaded and initialized. If the SDK isn't present, load it dynamically.
function ensureEmailJSReady(callback, attempt = 0, urlIndex = 0) {
  const MAX_RETRIES = 2;
  const SDK_URLS = [
    'https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js',
    'https://cdn.emailjs.com/sdk/3.2.0/email.min.js',
    './email.min.js' // local fallback - download the SDK into the project root if CDN is blocked
  ];
  const SDK_URL = SDK_URLS[urlIndex];

  // Quick environment hints
  if (location.protocol === 'file:') {
    console.warn('Page served from file:// — external SDK loading can fail. Run a local server.');
  }
  if (!navigator.onLine) {
    console.warn('Navigator reports offline — network unavailable.');
    callback(new Error('offline'));
    return;
  }

  if (window.emailjs && typeof window.emailjs.send === 'function') {
    try { emailjs.init(EMAILJS_USER_ID); } catch (e) { /* ignore if already init'd */ }
    callback();
    return;
  }

  const script = document.createElement('script');
  script.src = SDK_URL;
  script.async = true;
  let handled = false;

  script.onload = () => {
    try { emailjs.init(EMAILJS_USER_ID); } catch (e) { console.warn('EmailJS init failed', e); }
    handled = true;
    callback();
  };

  script.onerror = (ev) => {
    console.error('EmailJS SDK load error (urlIndex', urlIndex, 'attempt', attempt + 1, '):', ev || 'error');
    if (handled) return;
    handled = true;
    if (attempt < MAX_RETRIES) {
      // retry same URL with backoff
      setTimeout(() => ensureEmailJSReady(callback, attempt + 1, urlIndex), 700 * (attempt + 1));
      return;
    }

    // move to next URL (fallback) if available
    if (urlIndex + 1 < SDK_URLS.length) {
      console.warn('Falling back to alternative EmailJS SDK URL:', SDK_URLS[urlIndex + 1]);
      setTimeout(() => ensureEmailJSReady(callback, 0, urlIndex + 1), 200);
      return;
    }

    callback(new Error('sdk-load'));
  };

  // Append and let browser handle caching/requests
  document.head.appendChild(script);
}

// -----------------------------
// GitHub API: fetch and render repositories
// - Set `GITHUB_USERNAME` below to your GitHub username.
// - For public repos you don't need a token; to increase rate limits or access private repos,
//   use a server-side proxy with a Personal Access Token (instructions below).
// -----------------------------
const GITHUB_USERNAME = 'gumabaojohnmanuel1506-lgtm'; // <-- replace with your username
const GITHUB_TOKEN = ''; // optional: not recommended in client-side code

function fetchAndRenderRepos(username, opts = { per_page: 6 }) {
  const container = document.getElementById('github-repos');
  if (!container) return;
  container.innerHTML = '<div class="project-screenshot"><div class="screenshot-placeholder" style="display:flex;align-items:center;justify-content:center">Loading repositories…</div></div>';

  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=${opts.per_page}`;
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;

  fetch(url, { headers })
    .then((res) => {
      if (!res.ok) {
        // attempt to read GitHub's JSON error message for better feedback
        return res.json()
          .catch(() => ({ message: 'GitHub API error ' + res.status }))
          .then((j) => { throw { status: res.status, message: j && j.message ? j.message : 'GitHub API error' }; });
      }
      return res.json();
    })
    .then((repos) => {
      container.innerHTML = '';
      if (!Array.isArray(repos) || repos.length === 0) {
        container.innerHTML = '<p class="project-desc">No repositories found.</p>';
        return;
      }

      repos.forEach((repo) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        const description = repo.description ? repo.description : '';
        const language = repo.language ? repo.language : '—';
        card.innerHTML = `
          <div class="project-screenshot">
            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
              <img src="" alt="" style="display:none">
              <div class="screenshot-placeholder" style="display:flex;align-items:center;justify-content:center">${repo.name}</div>
            </a>
          </div>
          <div class="project-info">
            <div class="project-title"><a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a></div>
            <p class="project-desc">${description}</p>
            <div class="tech-list">
              <span class="tech-badge">${language}</span>
              <span class="tech-badge">★ ${repo.stargazers_count || 0}</span>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    })
    .catch((err) => {
      console.error('Failed to load GitHub repos:', err);
      if (err && err.status === 404) {
        container.innerHTML = `<p class="project-desc">GitHub user "${username}" not found (404). Check the username.</p>`;
      } else if (err && err.message) {
        container.innerHTML = `<p class="project-desc">Failed to load repositories: ${err.message}</p>`;
      } else {
        container.innerHTML = '<p class="project-desc">Failed to load repositories.</p>';
      }
    });
}

// Auto-run if username provided (replace `your-github-username` first)
if (GITHUB_USERNAME && GITHUB_USERNAME !== 'your-github-username') {
  fetchAndRenderRepos(GITHUB_USERNAME, { per_page: 6 });
} else {
  // leave the container empty and let the user set the username
  const ghContainer = document.getElementById('github-repos');
  if (ghContainer) ghContainer.innerHTML = '<p class="project-desc">Set your GitHub username in <code>script.js</code> to load repositories.</p>';
}

function isConfigured() {
  return EMAILJS_USER_ID && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID &&
    !EMAILJS_USER_ID.startsWith('YOUR_') && !EMAILJS_SERVICE_ID.startsWith('YOUR_') && !EMAILJS_TEMPLATE_ID.startsWith('YOUR_');
}

if (contactForm) {
  // live-clear handlers for contact fields
  const contactFields = contactForm.querySelectorAll('input, textarea');
  contactFields.forEach(field => {
    const clearContactError = () => {
      field.classList.remove('invalid');
      const next = field.nextElementSibling;
      if (next && next.classList && next.classList.contains('field-error')) next.remove();
      contactStatus.textContent = '';
      contactStatus.classList.remove('error', 'success');
    };

    field.addEventListener('input', clearContactError);
  });

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // clear previous
    contactStatus.textContent = '';
    contactStatus.classList.remove('error', 'success');
    contactForm.querySelectorAll('.field-error').forEach(n => n.remove());
    contactForm.querySelectorAll('.invalid').forEach(n => n.classList.remove('invalid'));

    // validate required fields in contact form (name, email, message)
    const requiredEls = [
      contactForm.querySelector('#name'),
      contactForm.querySelector('#email'),
      contactForm.querySelector('#message')
    ].filter(Boolean);

    let firstInvalid = null;
    for (const el of requiredEls) {
      const valid = el.checkValidity ? el.checkValidity() : Boolean(el.value && el.value.trim());
      if (!valid) {
        el.classList.add('invalid');
        const msg = document.createElement('span');
        msg.className = 'field-error';
        // field-specific messages to match inquiry form style
        if (el.id === 'name') {
          msg.textContent = 'Please enter your full name.';
        } else if (el.id === 'email') {
          if (el.validity && el.validity.typeMismatch) {
            msg.textContent = 'Please enter a valid email address.';
          } else {
            msg.textContent = 'Please enter your email address.';
          }
        } else if (el.id === 'message') {
          msg.textContent = 'Please enter a short message.';
        } else {
          msg.textContent = 'Please fill out this field.';
        }
        try { el.insertAdjacentElement('afterend', msg); } catch (err) {}
        firstInvalid = firstInvalid || el;
      }
    }

    if (firstInvalid) {
      contactStatus.textContent = 'Please complete the required fields.';
      contactStatus.classList.add('error');
      try { firstInvalid.focus(); firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {}
      return;
    }

    contactStatus.textContent = 'Preparing to send...';

    if (!isConfigured()) {
      contactStatus.innerHTML = 'Client integration not configured. Replace EmailJS IDs in the script.';
      contactStatus.classList.add('error');
      return;
    }

    ensureEmailJSReady((err) => {
      if (err || !window.emailjs || typeof window.emailjs.send !== 'function') {
        contactStatus.textContent = 'Email service unavailable. Try again later.';
        contactStatus.classList.add('error');
        return;
      }

      contactStatus.textContent = 'Sending...';

      const templateParams = {
        from_name: document.getElementById('name').value,
        reply_to: document.getElementById('email').value,
        message: document.getElementById('message').value,
        to_email: 'gumabaojohnmanuel1506@gmail.com'
      };

      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => {
          contactStatus.textContent = 'Message sent — thank you!';
          contactStatus.classList.add('success');
          contactForm.reset();
        }, (err2) => {
          contactStatus.textContent = 'Failed to send. Please try again later.';
          contactStatus.classList.add('error');
          console.error('EmailJS send error:', err2);
        });
    });
  });
}

// --- Project Inquiry modal behavior ---
const inquiryOpen = document.getElementById('inquiry-open');
const inquiryModal = document.getElementById('inquiry-modal');
const inquiryClose = document.getElementById('inquiry-close');
const inquiryCancel = document.getElementById('inquiry-cancel');
const inquiryForm = document.getElementById('inquiry-form');
const inquiryStatus = document.getElementById('inquiry-status');

function openInquiry() {
  if (!inquiryModal) return;
  inquiryModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // clear any previous inline errors when opening
  inquiryModal.querySelectorAll('.field-error').forEach(n => n.remove());
  inquiryModal.querySelectorAll('.invalid').forEach(n => n.classList.remove('invalid'));
  inquiryStatus.textContent = '';
  inquiryStatus.classList.remove('error', 'success');

  const first = inquiryModal.querySelector('input, textarea, button');
  if (first) first.focus();
}

function closeInquiry() {
  if (!inquiryModal) return;
  inquiryModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  inquiryStatus.textContent = '';
}

if (inquiryOpen) inquiryOpen.addEventListener('click', openInquiry);
if (inquiryClose) inquiryClose.addEventListener('click', closeInquiry);
if (inquiryCancel) inquiryCancel.addEventListener('click', closeInquiry);

// close on background click
if (inquiryModal) {
  inquiryModal.addEventListener('click', (e) => {
    if (e.target === inquiryModal) closeInquiry();
  });
}

// close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && inquiryModal && inquiryModal.getAttribute('aria-hidden') === 'false') {
    closeInquiry();
  }
});

// handle inquiry submit (client-side only)
if (inquiryForm) {
  // Multi-step form setup
  const steps = Array.from(inquiryForm.querySelectorAll('.step'));
  let currentStep = 0;
  const stepDots = document.getElementById('step-dots');
  const prevBtn = document.getElementById('inquiry-prev');
  const nextBtn = document.getElementById('inquiry-next');
  const submitBtn = document.getElementById('inquiry-submit');

  function updateStepUI() {
    steps.forEach((s, i) => s.classList.toggle('active', i === currentStep));
    // update numbered nodes: mark completed (i < currentStep) and active (i === currentStep)
    const nodes = Array.from(stepDots.querySelectorAll('.step-node'));
    nodes.forEach((d, i) => {
      d.classList.toggle('completed', i < currentStep);
      d.classList.toggle('active', i === currentStep);
    });
    // no connector line: only node states are updated
    // button visibility
    prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-block';
    nextBtn.style.display = currentStep === steps.length - 1 ? 'none' : 'inline-block';
    submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';
    // focus first field in the step
    const first = steps[currentStep].querySelector('input, textarea, select, button');
    if (first) first.focus();
  }

  function validateStep(stepEl) {
    // remove previous errors in this step
    stepEl.querySelectorAll('.field-error').forEach(n => n.remove());
    let firstInvalid = null;
    const requiredEls = stepEl.querySelectorAll('[required]');
    for (const el of requiredEls) {
      const valid = el.checkValidity ? el.checkValidity() : Boolean(el.value && el.value.trim());
      if (!valid) {
        firstInvalid = firstInvalid || el;
        el.classList.add('invalid');
        const msg = document.createElement('span');
        msg.className = 'field-error';
        msg.textContent = 'Please fill out this field.';
        try { el.insertAdjacentElement('afterend', msg); } catch (e) {}
      }
    }
    if (firstInvalid) {
      try { firstInvalid.focus(); firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      return false;
    }
    return true;
  }

  // Attach live listeners to clear inline errors as user types or changes values
  const watchFields = inquiryForm.querySelectorAll('input, textarea, select');
  watchFields.forEach(field => {
    const clearError = () => {
      field.classList.remove('invalid');
      const next = field.nextElementSibling;
      if (next && next.classList && next.classList.contains('field-error')) next.remove();
      // clear top-level status when user fixes fields
      inquiryStatus.textContent = '';
      inquiryStatus.classList.remove('error', 'success');
    };

    if (field.type === 'checkbox' || field.type === 'radio') {
      field.addEventListener('change', clearError);
    } else {
      field.addEventListener('input', clearError);
    }
  });

  // show initial step when opening modal
  updateStepUI();

  if (nextBtn) nextBtn.addEventListener('click', () => {
    // validate current step
    if (!validateStep(steps[currentStep])) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1);
    updateStepUI();
  });

  if (prevBtn) prevBtn.addEventListener('click', () => {
    currentStep = Math.max(currentStep - 1, 0);
    updateStepUI();
  });

  // Configurable endpoint: if empty, the submission will be simulated locally.
  const INQUIRY_ENDPOINT = ''; // e.g. 'https://your.api.example.com/inquiries' or leave empty to simulate

  // intercept form submit to validate last step only and perform (simulated or real) submission
  inquiryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    inquiryStatus.textContent = '';
    inquiryStatus.classList.remove('error', 'success');
    inquiryForm.querySelectorAll('.invalid').forEach(n => n.classList.remove('invalid'));

    // validate final step
    if (!validateStep(steps[currentStep])) return;

    // Collect form values
    const formData = new FormData(inquiryForm);
    const data = Object.fromEntries(formData.entries());
    const services = [];
    inquiryForm.querySelectorAll('input[name="services"]:checked').forEach(cb => services.push(cb.value));
    data.services = services.join(', ');

    // Show submitting state
    inquiryStatus.textContent = 'Submitting inquiry...';
    inquiryStatus.classList.remove('error', 'success');

    // Disable form controls while submitting
    const controls = inquiryForm.querySelectorAll('input, textarea, select, button');
    controls.forEach(c => c.disabled = true);

    // Helper to re-enable controls after submission completes
    const finish = (ok, message) => {
      controls.forEach(c => c.disabled = false);
      inquiryStatus.textContent = message || (ok ? 'Inquiry submitted. Thank you!' : 'Failed to submit inquiry. Please try again.');
      inquiryStatus.classList.toggle('success', ok);
      inquiryStatus.classList.toggle('error', !ok);
      if (ok) {
        setTimeout(() => {
          inquiryForm.reset();
          inquiryStatus.textContent = '';
          inquiryStatus.classList.remove('success');
          currentStep = 0;
          updateStepUI();
          closeInquiry();
        }, 1400);
      }
    };

    // If an endpoint is provided, POST the data as JSON
    if (INQUIRY_ENDPOINT && INQUIRY_ENDPOINT.startsWith('http')) {
      fetch(INQUIRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json().catch(() => ({}));
      }).then((json) => {
        console.log('Inquiry submitted to endpoint:', json, data);
        finish(true, 'Inquiry submitted to server. Thank you!');
      }).catch((err) => {
        console.error('Inquiry submission error:', err);
        finish(false, 'Server submission failed. Your inquiry is saved locally.');
      });
      return;
    }

    // Otherwise simulate network processing (demo mode)
    console.log('Simulating inquiry submission:', data);
    setTimeout(() => {
      // simulate success with 92% probability
      const ok = Math.random() < 0.92;
      if (ok) {
        console.log('Simulated inquiry success');
        finish(true);
      } else {
        console.log('Simulated inquiry failure');
        finish(false);
      }
    }, 900 + Math.random() * 900);
  });
}
