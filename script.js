// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation
    const smoothScroll = (target) => {
        document.querySelector(target).scrollIntoView({
            behavior: 'smooth'
        });
    };

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        observer.observe(section);
    });

    // Counter animation for stats
    function animateCounter(element, start, end, duration) {
        let startTime = null;
        
        function animate(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = current + (element.dataset.suffix || '');
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Animate counters when they come into view
    const statNumbers = document.querySelectorAll('.stat-number, .cta-number');
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const text = element.textContent;
                const number = parseInt(text.replace(/\D/g, '')) || 0;
                
                if (text.includes('%')) {
                    element.dataset.suffix = '%';
                } else if (text.includes('x')) {
                    element.dataset.suffix = 'x';
                } else if (text.includes('+')) {
                    element.dataset.suffix = '+';
                } else if (text.includes('B')) {
                    element.dataset.suffix = 'B';
                } else if (text.includes('M')) {
                    element.dataset.suffix = 'M';
                } else if (text.includes('K')) {
                    element.dataset.suffix = 'K';
                }
                
                animateCounter(element, 0, number, 2000);
                statObserver.unobserve(element);
            }
        });
    }, observerOptions);

    statNumbers.forEach(stat => {
        statObserver.observe(stat);
    });

    // Typewriter effect for code block
    function typeWriter(element, text, speed = 50) {
        let i = 0;
        element.textContent = '';
        
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        
        type();
    }

    // Animate code block when it comes into view
    const codeBlock = document.querySelector('.code-block code');
    const codeText = codeBlock.textContent;
    const codeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    typeWriter(codeBlock, codeText, 30);
                }, 500);
                codeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    codeObserver.observe(codeBlock);

    // Parallax effect for floating elements
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.edi-logo');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });

    // Interactive hover effects for problem items
    const problemItems = document.querySelectorAll('.problem-item');
    problemItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Button click handlers
    const primaryBtn = document.querySelector('.btn-primary');
    const secondaryBtn = document.querySelector('.btn-secondary');

    if (primaryBtn) {
        primaryBtn.addEventListener('click', function() {
            // Simulate early access signup
            this.textContent = 'Joining...';
            this.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
            
            setTimeout(() => {
                this.textContent = 'Welcome Aboard! ✓';
                this.style.transform = 'scale(1.05)';
                
                // Create celebration effect
                createParticles(this);
            }, 1500);
        });
    }

    if (secondaryBtn) {
        secondaryBtn.addEventListener('click', function() {
            // Simulate demo scheduling
            this.textContent = 'Scheduling...';
            this.style.borderColor = '#22c55e';
            this.style.color = '#22c55e';
            
            setTimeout(() => {
                this.textContent = 'Demo Scheduled! ✓';
                this.style.background = '#22c55e';
                this.style.color = 'white';
                this.style.transform = 'scale(1.05)';
            }, 1500);
        });
    }

    // Particle effect function
    function createParticles(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: #4facfe;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${centerX}px;
                top: ${centerY}px;
            `;
            
            document.body.appendChild(particle);
            
            const angle = (Math.PI * 2 * i) / 20;
            const velocity = 100 + Math.random() * 100;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            let x = 0, y = 0, opacity = 1;
            
            function animateParticle() {
                x += vx * 0.02;
                y += vy * 0.02 + 2; // gravity
                opacity -= 0.02;
                
                particle.style.transform = `translate(${x}px, ${y}px)`;
                particle.style.opacity = opacity;
                
                if (opacity > 0) {
                    requestAnimationFrame(animateParticle);
                } else {
                    particle.remove();
                }
            }
            
            requestAnimationFrame(animateParticle);
        }
    }

    // Dynamic background animation
    function createFloatingElements() {
        const hero = document.querySelector('.hero-section');
        
        for (let i = 0; i < 5; i++) {
            const element = document.createElement('div');
            element.style.cssText = `
                position: absolute;
                width: ${Math.random() * 100 + 50}px;
                height: ${Math.random() * 100 + 50}px;
                background: linear-gradient(45deg, 
                    rgba(79, 172, 254, 0.1), 
                    rgba(255, 123, 67, 0.1)
                );
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 10 + 10}s infinite linear;
                pointer-events: none;
            `;
            
            hero.appendChild(element);
        }
    }

    createFloatingElements();

    // Progress bar animation for market segments
    const segmentBars = document.querySelectorAll('.segment-fill');
    const segmentObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const width = bar.style.width;
                bar.style.width = '0%';
                
                setTimeout(() => {
                    bar.style.width = width;
                    bar.style.transition = 'width 2s ease-out';
                }, 100);
                
                segmentObserver.unobserve(bar);
            }
        });
    }, observerOptions);

    segmentBars.forEach(bar => {
        segmentObserver.observe(bar);
    });

    // Roadmap phase activation
    const phases = document.querySelectorAll('.phase');
    const roadmapObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                phases.forEach((phase, index) => {
                    setTimeout(() => {
                        phase.classList.add('phase-visible');
                        if (index === 0) {
                            phase.classList.add('active');
                        }
                    }, index * 300);
                });
                roadmapObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const roadmapSection = document.querySelector('.roadmap-timeline');
    if (roadmapSection) {
        roadmapObserver.observe(roadmapSection);
    }

    // Add CSS for additional animations
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation: fadeInUp 0.8s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .phase-visible {
            animation: phaseIn 0.6s ease-out forwards;
        }
        
        @keyframes phaseIn {
            from {
                opacity: 0;
                transform: translateY(30px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .code-block code {
            border-right: 2px solid #4facfe;
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { border-right-color: #4facfe; }
            51%, 100% { border-right-color: transparent; }
        }
        
        .floating-bg {
            animation: floatBackground 20s infinite linear;
        }
        
        @keyframes floatBackground {
            0% { transform: translateX(-100px) translateY(0px) rotate(0deg); }
            25% { transform: translateX(100px) translateY(-50px) rotate(90deg); }
            50% { transform: translateX(200px) translateY(0px) rotate(180deg); }
            75% { transform: translateX(100px) translateY(50px) rotate(270deg); }
            100% { transform: translateX(-100px) translateY(0px) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Performance optimization: Throttle scroll events
    let ticking = false;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.edi-logo');
        
        parallaxElements.forEach(element => {
            const speed = 0.3;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
        
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });

    console.log('EDI Pitch Deck loaded successfully! 🚀');
});