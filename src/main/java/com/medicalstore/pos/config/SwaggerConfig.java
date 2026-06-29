package com.medicalstore.pos.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MediZano Botica API")
                        .version("1.0.0")
                        .description("Backend para ventas, inventario y gestión de botica en Perú")
                        .contact(new Contact()
                                .name("MediZano Botica")
                                .email("soporte@medizano.pe"))
                        .license(new License()
                                .name("Propietaria")
                                .url("https://medizano.pe/licencia")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Autenticación con token JWT")));
    }
}






