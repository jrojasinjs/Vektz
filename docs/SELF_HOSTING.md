# Self-Hosting de Vektz con Nginx

Guia para hostear Vektz de forma permanente en tu propia maquina con Ubuntu y Nginx.

## Requisitos previos
- Ubuntu (22.04+)
- Acceso sudo
- El repo clonado en `/home/jrojas/GitRep/Vektz`

## Paso 1 — Instalar Nginx

```bash
sudo apt update
sudo apt install nginx
```

Verificar que esta corriendo:

```bash
sudo systemctl status nginx
```

## Paso 2 — Crear symlink al proyecto

```bash
sudo ln -s /home/jrojas/GitRep/Vektz /var/www/vektz
```

## Paso 3 — Configurar el site en Nginx

Crear el archivo de configuracion:

```bash
sudo nano /etc/nginx/sites-available/vektz
```

Contenido:

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/vektz;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache de assets estaticos
    location ~* \.(css|js|png|ico)$ {
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }
}
```

## Paso 4 — Activar el site

```bash
# Desactivar el site default de Nginx
sudo rm /etc/nginx/sites-enabled/default

# Activar el site de Vektz
sudo ln -s /etc/nginx/sites-available/vektz /etc/nginx/sites-enabled/

# Verificar la configuracion
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

Ahora Vektz esta disponible en `http://localhost` y en `http://<tu-ip-local>` para dispositivos en tu red local.

## Paso 5 — Exponer al internet

### 5a. Abrir puerto en el router

1. Entrar al panel de admin del router (generalmente `192.168.1.1`)
2. Buscar la seccion **Port Forwarding** o **NAT**
3. Crear una regla:
   - Puerto externo: `80` (HTTP) y `443` (HTTPS)
   - Puerto interno: `80` y `443`
   - IP interna: la IP local de tu maquina (ej: `192.168.1.100`)
   - Protocolo: TCP

Para conocer tu IP local:

```bash
hostname -I
```

### 5b. IP publica vs dominio

Tu IP publica se puede consultar con:

```bash
curl ifconfig.me
```

El sitio queda accesible en `http://<tu-ip-publica>`. Si quieres un dominio:

- **Dominio propio**: comprarlo en Namecheap, Cloudflare, etc. (~$10/año) y apuntar el DNS A record a tu IP publica
- **DNS dinamico (gratis)**: si tu ISP cambia tu IP, usar un servicio como [DuckDNS](https://www.duckdns.org) o [No-IP](https://www.noip.com) que te da un subdominio y actualiza la IP automaticamente

### 5c. HTTPS con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Generar certificado (reemplazar con tu dominio)
sudo certbot --nginx -d tudominio.com
```

Certbot modifica la config de Nginx automaticamente y configura renovacion automatica del certificado.

## Paso 6 — Iniciar Nginx al arrancar

Nginx ya se habilita por default, pero para verificar:

```bash
sudo systemctl enable nginx
```

## Actualizar el sitio

Como Nginx sirve directamente desde el repo via symlink, solo hace falta:

```bash
cd /home/jrojas/GitRep/Vektz
git pull
```

No es necesario reiniciar Nginx. Los cambios se reflejan inmediatamente.

## Troubleshooting

### Nginx no puede leer los archivos
```bash
# Verificar permisos
sudo chmod 755 /home/jrojas
sudo chmod -R 755 /home/jrojas/GitRep/Vektz
```

### Ver logs de error
```bash
sudo tail -f /var/log/nginx/error.log
```

### Verificar que el puerto 80 esta abierto
```bash
sudo ss -tlnp | grep :80
```
