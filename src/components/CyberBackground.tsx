import React, { useEffect, useRef } from 'react';

interface CyberBackgroundProps {
  variant?: 'subtle' | 'intense';
}

export const CyberBackground: React.FC<CyberBackgroundProps> = ({ variant = 'intense' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Mouse state
    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Configuration based on variant
    const isIntense = variant === 'intense';
    
    const config = {
      particleCount: Math.min(150, (width * height) / 9000),
      connectionDistance: isIntense ? 180 : 120,
      mouseDistance: 150,
      particleSizeBase: isIntense ? 1 : 0.5,
      particleSizeRandom: isIntense ? 2 : 1.5,
      particleColor: isIntense ? 'rgba(255, 255, 255, 0.8)' : 'rgba(200, 200, 255, 0.5)',
      lineWidth: isIntense ? 1 : 0.5,
      lineColorBase: isIntense ? '255, 255, 255' : '100, 200, 255',
      lineOpacityMultiplier: isIntense ? 0.5 : 0.2,
      forceMultiplier: isIntense ? 3 : 2,
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseX: number;
      baseY: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * config.particleSizeRandom + config.particleSizeBase;
        this.baseX = this.x;
        this.baseY = this.y;
      }

      update() {
        // Normal movement
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.mouseDistance) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (config.mouseDistance - distance) / config.mouseDistance;
          
          // Repel (negative)
          const direction = -1; 
          
          const forceX = forceDirectionX * force * direction * config.forceMultiplier;
          const forceY = forceDirectionY * force * direction * config.forceMultiplier;

          this.x += forceX;
          this.y += forceY;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = config.particleColor;
        ctx.fill();
      }
    }

    const particles: Particle[] = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      
      // Update and draw particles
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      // Draw connections
      ctx.lineWidth = config.lineWidth;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < config.connectionDistance) {
            const opacity = 1 - (distance / config.connectionDistance);
            ctx.strokeStyle = `rgba(${config.lineColorBase}, ${opacity * config.lineOpacityMultiplier})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        
        // Connect to mouse if close
        const dx = mouse.x - particles[i].x;
        const dy = mouse.y - particles[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < config.mouseDistance) {
            const opacity = 1 - (distance / config.mouseDistance);
            ctx.strokeStyle = `rgba(${config.lineColorBase}, ${opacity * config.lineOpacityMultiplier})`;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(particles[i].x, particles[i].y);
            ctx.stroke();
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [variant]); // Re-run effect when variant changes

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: '#000000' }}
    />
  );
};
