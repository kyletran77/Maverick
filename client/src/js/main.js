// Main JavaScript file for OpenAI website clone

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
      mobileMenuButton.setAttribute('aria-expanded', !expanded);
      mobileMenu.classList.toggle('hidden');
    });
  }
  
  // Initialize animations
  initAnimations();
  
  // Initialize smooth scrolling for anchor links
  initSmoothScroll();
});

// Animation on scroll
function initAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  animatedElements.forEach(element => {
    observer.observe(element);
  });
}

// Smooth scrolling for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Video modal functionality
function openVideoModal(videoId) {
  const modal = document.getElementById('video-modal');
  const videoFrame = document.getElementById('video-frame');
  
  if (modal && videoFrame) {
    videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  const videoFrame = document.getElementById('video-frame');
  
  if (modal && videoFrame) {
    videoFrame.src = '';
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// Sticky header
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (header) {
    if (window.scrollY > 10) {
      header.classList.add('bg-white', 'shadow-sm');
    } else {
      header.classList.remove('bg-white', 'shadow-sm');
    }
  }
});

// Form validation
function validateContactForm(form) {
  const emailInput = form.querySelector('input[type="email"]');
  const messageInput = form.querySelector('textarea');
  let isValid = true;
  
  if (emailInput && !isValidEmail(emailInput.value)) {
    showError(emailInput, 'Please enter a valid email address');
    isValid = false;
  }
  
  if (messageInput && messageInput.value.trim() === '') {
    showError(messageInput, 'Please enter a message');
    isValid = false;
  }
  
  return isValid;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showError(input, message) {
  const errorElement = document.createElement('p');
  errorElement.className = 'text-red-500 text-sm mt-1';
  errorElement.textContent = message;
  
  const parent = input.parentElement;
  const existingError = parent.querySelector('.text-red-500');
  
  if (!existingError) {
    parent.appendChild(errorElement);
  }
  
  input.classList.add('border-red-500');
  
  input.addEventListener('input', () => {
    const error = parent.querySelector('.text-red-500');
    if (error) {
      parent.removeChild(error);
    }
    input.classList.remove('border-red-500');
  }, { once: true });
}
