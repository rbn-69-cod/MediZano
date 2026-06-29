package com.medicalstore.pos.dto.request;

import com.medicalstore.pos.entity.Payment;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {
    @NotNull(message = "Selecciona un medio de pago")
    private Payment.PaymentMode mode;
    
    @NotNull(message = "Ingresa el monto del pago")
    @Min(value = 0, message = "El monto del pago debe ser positivo")
    private BigDecimal amount;
    
    private String paymentReference;
}






