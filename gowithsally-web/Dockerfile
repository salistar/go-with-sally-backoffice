##############################################################################
# GoWithSally Web Frontend - Dockerfile
# Sert le fichier HTML statique via Nginx
##############################################################################

FROM nginx:1.25-alpine

RUN apk add --no-cache curl

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static web application
COPY public/ /usr/share/nginx/html/

# Create health check endpoint
RUN echo "OK" > /usr/share/nginx/html/health

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
