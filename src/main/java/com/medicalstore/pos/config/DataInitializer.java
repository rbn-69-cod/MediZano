package com.medicalstore.pos.config;

import com.medicalstore.pos.entity.User;
import com.medicalstore.pos.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Data initializer for creating default users for each role.
 * In production, remove this or secure it properly.
 */
@Configuration
public class DataInitializer {

    @Value("${MEDIZANO_DEFAULT_PASSWORD:}")
    private String configuredDefaultPassword;
    
    @Bean
    public CommandLineRunner initData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            String defaultPassword = configuredDefaultPassword == null ? "" : configuredDefaultPassword.trim();
            String encodedDefaultPassword = defaultPassword.isEmpty() ? null : passwordEncoder.encode(defaultPassword);
            boolean canCreateUsers = encodedDefaultPassword != null;
            
            // Update or create admin user with configured password and role.
            userRepository.findByUsername("admin").ifPresentOrElse(
                existingAdmin -> {
                    if (encodedDefaultPassword != null) {
                        existingAdmin.setPassword(encodedDefaultPassword);
                    }
                    existingAdmin.setRole(User.Role.ADMIN);
                    existingAdmin.setActive(true);
                    existingAdmin.setEmail("admin@boticapos.pe");
                    existingAdmin.setFullName("Administrador del sistema");
                    userRepository.save(existingAdmin);
                    System.out.println("============================================");
                    System.out.println("✅ Updated existing admin user");
                    System.out.println("   Username: admin");
                    System.out.println("   Role: ADMIN");
                    System.out.println("============================================");
                },
                () -> {
                    if (!canCreateUsers) {
                        System.out.println("Admin user not found. Set MEDIZANO_DEFAULT_PASSWORD to create initial users.");
                        return;
                    }

                    User admin = User.builder()
                            .username("admin")
                            .password(encodedDefaultPassword)
                            .email("admin@boticapos.pe")
                            .fullName("Administrador del sistema")
                            .role(User.Role.ADMIN)
                            .active(true)
                            .build();
                    userRepository.save(admin);
                    System.out.println("Created new admin user");
                }
            );
            
            // Create or update all other users
            createOrUpdateUser(userRepository, "cajero", encodedDefaultPassword, "cajero@boticapos.pe",
                    "Cajero", User.Role.CASHIER);
            createOrUpdateUser(userRepository, "inventario", encodedDefaultPassword, "inventario@boticapos.pe",
                    "Monitor de inventario", User.Role.STOCK_MONITOR);
            createOrUpdateUser(userRepository, "almacen", encodedDefaultPassword, "almacen@boticapos.pe",
                    "Encargado de almacen", User.Role.STOCK_KEEPER);
            createOrUpdateUser(userRepository, "soporte", encodedDefaultPassword, "soporte@boticapos.pe",
                    "Atencion al cliente", User.Role.CUSTOMER_SUPPORT);
            createOrUpdateUser(userRepository, "analista", encodedDefaultPassword, "analista@boticapos.pe",
                    "Analista de datos", User.Role.ANALYST);
            createOrUpdateUser(userRepository, "gerente", encodedDefaultPassword, "gerente@boticapos.pe",
                    "Gerente", User.Role.MANAGER);
            
            System.out.println("============================================");
            System.out.println("✅ All users created/updated successfully!");
            System.out.println("============================================");
            System.out.println();
            System.out.println("Role          | Username          | Access");
            System.out.println("--------------|-------------------|------------------------------------------");
            System.out.println("Admin         | admin             | All pages");
            System.out.println("Cashier       | cajero            | Billing");
            System.out.println("Stock Monitor | inventario        | Inventory");
            System.out.println("Stock Keeper  | almacen           | Medicines");
            System.out.println("Customer Sup. | soporte           | Returns");
            System.out.println("Analyst       | analista          | Reports");
            System.out.println("Manager       | gerente           | Reports + Purchase History");
            System.out.println("============================================");
            if (canCreateUsers) {
                System.out.println("Initial user password comes from MEDIZANO_DEFAULT_PASSWORD. Rotate it after setup.");
            } else {
                System.out.println("MEDIZANO_DEFAULT_PASSWORD not set. Existing passwords were preserved.");
            }
        };
    }
    
    private void createOrUpdateUser(UserRepository userRepository, String username, String password, 
                                   String email, String fullName, User.Role role) {
        userRepository.findByUsername(username).ifPresentOrElse(
            existingUser -> {
                // Update existing user
                if (password != null) {
                    existingUser.setPassword(password);
                }
                existingUser.setRole(role);
                existingUser.setActive(true);
                existingUser.setEmail(email);
                existingUser.setFullName(fullName);
                userRepository.save(existingUser);
                System.out.println("✅ Updated user: " + username);
            },
            () -> {
                if (password == null) {
                    System.out.println("Skipped user creation because MEDIZANO_DEFAULT_PASSWORD is not set: " + username);
                    return;
                }

                // Create new user
                User newUser = User.builder()
                        .username(username)
                        .password(password)
                        .email(email)
                        .fullName(fullName)
                        .role(role)
                        .active(true)
                        .build();
                userRepository.save(newUser);
                System.out.println("✅ Created user: " + username);
            }
        );
    }
}

