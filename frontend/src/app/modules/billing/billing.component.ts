import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { BillingService } from '../../core/services/billing.service';
import { InventoryService } from '../../core/services/inventory.service';
import { DialogService } from '../../core/services/dialog.service';
import { Medicine } from '../../core/models/medicine.model';
import { BillItemRequest, CreateBillRequest, BillResponse, PaymentMode, PaymentRequest } from '../../core/models/billing.model';
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Observable, Subject, Subscription, of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface BillItem {
  medicine?: Medicine;
  medicineId?: number;
  barcode?: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

@Component({
  selector: 'app-billing',
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit, OnDestroy {
  // Expose PaymentMode enum to template
  PaymentMode = PaymentMode;
  
  billForm: FormGroup;
  items: BillItem[] = [];
  isLoading = false;
  currentBill: BillResponse | null = null;
  searchBarcode = '';
  searchMedicine = '';
  medicineSearchResults: Medicine[] = [];
  isSearchingMedicines = false;
  private medicineSearchTerms$ = new Subject<string>();
  private medicineSearchSubscription?: Subscription;
  
  // Camera scanning
  isScanning = false;
  hasCamera = false;
  private codeReader: BrowserMultiFormatReader | null = null;
  private stream: MediaStream | null = null;
  private lastScannedBarcode = '';
  private lastScannedAt = 0;
  private stableScanCount = 0;

  constructor(
    private fb: FormBuilder,
    private billingService: BillingService,
    private inventoryService: InventoryService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef
  ) {
    this.billForm = this.fb.group({
      customerName: [''],
      customerPhone: [''],
      payments: this.fb.array([
        this.fb.group({
          mode: [PaymentMode.CASH, Validators.required],
          amount: [0, [Validators.required, Validators.min(0.01)]],
          cashProvided: [0, [Validators.min(0)]]
        })
      ])
    });
  }

  async ngOnInit(): Promise<void> {
    this.resetBill();
    this.setupMedicineRealtimeSearch();
    // Check if camera is available
    await this.checkCameraAvailability();
  }

  ngOnDestroy(): void {
    this.medicineSearchSubscription?.unsubscribe();
    this.stopScanning();
  }

  private setupMedicineRealtimeSearch(): void {
    this.medicineSearchSubscription = this.medicineSearchTerms$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          const query = term.trim();
          if (query.length < 2) {
            this.medicineSearchResults = [];
            this.isSearchingMedicines = false;
            return of([]);
          }

          this.isSearchingMedicines = true;
          return this.inventoryService.searchMedicines(query).pipe(
            catchError((error: any) => {
              console.error('Error al buscar medicamentos en tiempo real:', error);
              return of([]);
            })
          );
        })
      )
      .subscribe((medicines) => {
        this.medicineSearchResults = medicines || [];
        this.isSearchingMedicines = false;
      });
  }

  async checkCameraAvailability(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.hasCamera = devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error al verificar disponibilidad de cámara:', error);
      this.hasCamera = false;
    }
  }

  async startScanning(): Promise<void> {
    if (!this.hasCamera) {
      this.dialogService.error('Cámara no disponible. Ingresa el código manualmente.');
      return;
    }

    try {
      this.isScanning = true;
      // Force change detection to render the video element
      this.cdr.detectChanges();
      
      // Wait for Angular to render the element with retries
      let videoElement: HTMLVideoElement | null = null;
      let retries = 0;
      const maxRetries = 50; // 5 seconds total wait time
      
      while (!videoElement && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        videoElement = document.getElementById('video-scanner') as HTMLVideoElement;
        if (!videoElement) {
          // Force another change detection cycle
          this.cdr.detectChanges();
        }
        retries++;
      }
      
      if (!videoElement) {
        console.error('Elemento de video no encontrado despues de reintentos');
        this.dialogService.error('No se pudo abrir el visor de cámara. Actualiza la página e intenta otra vez.');
        this.isScanning = false;
        return;
      }
      
      // Configure barcode reader with multiple formats
      // Note: ZXing supports Code 128, Code 39, Code 93, ITF (2of5)
      // For Code 11, MSI, Pharmacode, Telepen - may need additional libraries
      const hints = new Map();
      const formats = [
        BarcodeFormat.CODE_128,        // Code 128 ✓
        BarcodeFormat.CODE_39,         // Code 39 ✓ (Full ASCII supported via hints)
        BarcodeFormat.CODE_93,         // Code 93 ✓
        BarcodeFormat.ITF,             // Interleaved 2 of 5 ✓
        BarcodeFormat.CODABAR,         // Similar to Code 11
        BarcodeFormat.EAN_13,          // EAN-13
        BarcodeFormat.EAN_8,           // EAN-8
        BarcodeFormat.UPC_A,           // UPC-A
        BarcodeFormat.UPC_E,           // UPC-E
        BarcodeFormat.DATA_MATRIX,     // Data Matrix
        BarcodeFormat.QR_CODE,         // QR Code
        BarcodeFormat.PDF_417,         // PDF417
        BarcodeFormat.AZTEC            // Aztec
      ];
      
      // Filter out any undefined formats
      const validFormats = formats.filter(f => f !== undefined);
      
      hints.set(DecodeHintType.POSSIBLE_FORMATS, validFormats);
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.ASSUME_GS1, false);
      hints.set(DecodeHintType.ASSUME_CODE_39_CHECK_DIGIT, false);
      
      this.codeReader = new BrowserMultiFormatReader(hints);
      
      // Get available video devices
      const videoInputDevices = await this.codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        this.dialogService.error('No se encontraron cámaras en el dispositivo.');
        this.isScanning = false;
        return;
      }

      const selectedDeviceId = this.getPreferredCameraDeviceId(videoInputDevices);

      // Set the stream to the video element (we know it exists from the check above)
      if (!videoElement) {
        this.dialogService.error('No se encontró el visor de cámara.');
        this.isScanning = false;
        return;
      }

      // Store reference to avoid null checks in callbacks
      const video = videoElement;
      
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('muted', 'true');

      // Start scanning
      await this.codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        video,
        (result, error) => {
          if (result) {
            const barcode = result.getText();
            if (this.isStableScan(barcode)) {
              this.handleScannedBarcode(barcode);
              this.stopScanning();
            }
          }
          
          if (error && !(error instanceof NotFoundException)) {
            // NotFoundException is normal - it means no barcode found yet
            console.error('Error de escaneo:', error);
          }
        }
      );
      this.stream = video.srcObject as MediaStream | null;
    } catch (error: any) {
      console.error('Error al iniciar cámara:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.dialogService.error('Permiso de cámara denegado. Habilita el acceso a la cámara.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.dialogService.error('No se encontró cámara. Revisa tu dispositivo.');
      } else {
        this.dialogService.error('No se pudo iniciar la cámara: ' + (error.message || 'error desconocido'));
      }
      this.isScanning = false;
      this.stopScanning();
    }
  }

  stopScanning(): void {
    // Stop the video stream
    const videoElement = document.getElementById('video-scanner') as HTMLVideoElement;
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.pause();
    }
    
    if (this.codeReader) {
      this.codeReader.reset();
      this.codeReader = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isScanning = false;
    this.lastScannedBarcode = '';
    this.lastScannedAt = 0;
    this.stableScanCount = 0;
  }

  handleScannedBarcode(barcode: string): void {
    const scannedCode = this.extractBarcodeFromScan(barcode);
    if (!scannedCode) {
      return;
    }

    // Update the search input
    this.searchBarcode = scannedCode;
    
    // Process the barcode
    this.processBarcode(scannedCode);
  }

  processBarcode(barcode: string): void {
    this.isLoading = true;
    const normalizedBarcode = this.extractBarcodeFromScan(barcode);
    if (!normalizedBarcode) {
      this.dialogService.warning('Ingresa o escanea un código válido.');
      this.isLoading = false;
      return;
    }

    this.findMedicineByBarcodeCandidates(normalizedBarcode).subscribe({
      next: ({ medicine, barcode: matchedBarcode }) => {
        this.addItemByMedicine(medicine, 1, matchedBarcode);
        this.searchBarcode = '';
        this.isLoading = false;
        this.dialogService.success(`Escaneado: ${medicine.name}`);
      },
      error: (error: any) => {
        const candidates = this.getBarcodeCandidates(normalizedBarcode);
        const suffix = candidates.length > 1 ? ` Codigos probados: ${candidates.join(', ')}` : '';
        this.dialogService.error((error.message || 'No se encontro un medicamento con este codigo') + suffix);
        this.isLoading = false;
      }
    });
  }

  private isStableScan(value: string): boolean {
    const barcode = this.extractBarcodeFromScan(value);
    const now = Date.now();

    if (!barcode) {
      return false;
    }

    if (barcode === this.lastScannedBarcode && now - this.lastScannedAt < 1500) {
      this.stableScanCount++;
    } else {
      this.lastScannedBarcode = barcode;
      this.stableScanCount = 1;
    }

    this.lastScannedAt = now;
    return this.stableScanCount >= 2;
  }

  private findMedicineByBarcodeCandidates(barcode: string, index = 0): Observable<{ medicine: Medicine; barcode: string }> {
    const candidates = this.getBarcodeCandidates(barcode);
    const candidate = candidates[index];

    if (!candidate) {
      return throwError(() => new Error('No se encontro un producto con este codigo.'));
    }

    return new Observable((observer) => {
      const subscription = this.inventoryService.findMedicineByBarcode(candidate).subscribe({
        next: (medicine) => {
          observer.next({ medicine, barcode: candidate });
          observer.complete();
        },
        error: () => {
          this.findMedicineByBarcodeCandidates(barcode, index + 1).subscribe(observer);
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  private getPreferredCameraDeviceId(devices: MediaDeviceInfo[]): string | null {
    const backCameraKeywords = ['back', 'rear', 'environment', 'trasera', 'posterior'];
    const preferredDevice = devices.find((device) => {
      const label = device.label.toLowerCase();
      return backCameraKeywords.some((keyword) => label.includes(keyword));
    });

    return preferredDevice?.deviceId || devices[devices.length - 1]?.deviceId || null;
  }

  private extractBarcodeFromScan(value: string): string {
    const scannedValue = (value || '').trim();
    if (!scannedValue) {
      return '';
    }

    const urlBarcode = this.extractBarcodeFromUrl(scannedValue);
    if (urlBarcode) {
      return this.normalizeBarcodeValue(urlBarcode);
    }

    const keyValueMatch = scannedValue.match(/(?:barcode|barCode|code|qr|gtin|ean|upc)\s*[:=]\s*([A-Za-z0-9._-]+)/i);
    const extractedValue = (keyValueMatch?.[1] || scannedValue).trim();
    return this.normalizeBarcodeValue(extractedValue);
  }

  private normalizeBarcodeValue(value: string): string {
    const trimmedValue = value.trim();
    const alphanumeric = trimmedValue.replace(/[^A-Za-z0-9]/g, '');

    if (/^\d+$/.test(alphanumeric)) {
      return alphanumeric;
    }

    return trimmedValue;
  }

  private getBarcodeCandidates(barcode: string): string[] {
    const normalizedBarcode = this.normalizeBarcodeValue(barcode);
    const candidates = new Set<string>([normalizedBarcode]);

    if (/^\d+$/.test(normalizedBarcode)) {
      if (normalizedBarcode.length === 12) {
        candidates.add(`0${normalizedBarcode}`);
      }

      if (normalizedBarcode.length === 13 && normalizedBarcode.startsWith('0')) {
        candidates.add(normalizedBarcode.slice(1));
      }
    }

    return Array.from(candidates).filter(Boolean);
  }

  private extractBarcodeFromUrl(value: string): string {
    try {
      const url = new URL(value);
      const barcodeParams = ['barcode', 'barCode', 'code', 'qr', 'gtin', 'ean', 'upc'];
      for (const param of barcodeParams) {
        const paramValue = url.searchParams.get(param);
        if (paramValue?.trim()) {
          return paramValue.trim();
        }
      }

      const lastPathSegment = url.pathname.split('/').filter(Boolean).pop();
      return lastPathSegment?.trim() || '';
    } catch {
      return '';
    }
  }

  get paymentsFormArray(): FormArray {
    return this.billForm.get('payments') as FormArray;
  }

  get subtotal(): number {
    // Calculate subtotal without GST
    return this.items.reduce((sum, item) => {
      const itemSubtotal = (item.unitPrice || 0) * item.quantity;
      return sum + itemSubtotal;
    }, 0);
  }

  get totalGst(): number {
    const total = this.items.reduce((sum, item) => {
      if (!item.medicine || !item.medicine.gstPercentage || !item.unitPrice) {
        return sum;
      }

      const itemSubtotal = item.unitPrice * item.quantity;
      const gstPercentage = item.medicine.gstPercentage;
      if (gstPercentage <= 0 || gstPercentage > 100) {
        return sum;
      }

      return sum + (itemSubtotal * gstPercentage) / 100;
    }, 0);

    return this.roundCents(total);
  }

  get totalAmount(): number {
    const itemTotal = this.items.reduce((sum, item) => sum + (item.total || this.calculateRoundedItemTotal(item)), 0);
    return this.roundMoney(itemTotal);
  }

  get roundingAdjustment(): number {
    return Math.max(0, this.roundCents(this.totalAmount - this.subtotal - this.totalGst));
  }

  get totalPaid(): number {
    return this.paymentsFormArray.controls.reduce((sum, payment) => {
      const amount = Number(payment.get('amount')?.value || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  get amountDue(): number {
    return Math.max(0, this.roundMoney(this.totalAmount - this.totalPaid));
  }

  getCashProvided(index: number): number {
    const payment = this.paymentsFormArray.at(index);
    if (payment.get('mode')?.value === PaymentMode.CASH) {
      return payment.get('cashProvided')?.value || 0;
    }
    return 0;
  }

  getCashChange(index: number): number {
    const payment = this.paymentsFormArray.at(index);
    if (payment.get('mode')?.value === PaymentMode.CASH) {
      const cashProvided = payment.get('cashProvided')?.value || 0;
      const amount = payment.get('amount')?.value || 0;
      return Math.max(0, this.roundMoney(cashProvided - amount));
    }
    return 0;
  }

  onPaymentModeChange(index: number): void {
    const payment = this.paymentsFormArray.at(index);
    const mode = payment.get('mode')?.value;
    if (mode === PaymentMode.CASH) {
      payment.get('cashProvided')?.setValue(0);
    }
    this.recalculatePaymentAmounts();
  }

  onPaymentValueChange(): void {
    this.recalculatePaymentAmounts();
  }

  setExactCash(index: number): void {
    this.recalculatePaymentAmounts();
    const payment = this.paymentsFormArray.at(index);
    const amount = Number(payment.get('amount')?.value || 0);
    payment.get('cashProvided')?.setValue(this.roundMoney(amount));
    this.recalculatePaymentAmounts();
  }

  getPaymentAmount(index: number): number {
    return Number(this.paymentsFormArray.at(index).get('amount')?.value || 0);
  }

  private recalculatePaymentAmounts(): void {
    let accumulated = 0;
    const total = this.roundMoney(this.totalAmount);

    this.paymentsFormArray.controls.forEach((payment) => {
      const mode = payment.get('mode')?.value;
      const remaining = Math.max(0, this.roundMoney(total - accumulated));
      let appliedAmount = 0;

      if (mode === PaymentMode.CASH) {
        const cashProvided = Number(payment.get('cashProvided')?.value || 0);
        appliedAmount = Math.min(isNaN(cashProvided) ? 0 : cashProvided, remaining);
      } else {
        appliedAmount = remaining;
      }

      appliedAmount = this.roundMoney(appliedAmount);
      if (Number(payment.get('amount')?.value || 0) !== appliedAmount) {
        payment.get('amount')?.setValue(appliedAmount, { emitEvent: false });
      }
      accumulated += appliedAmount;
    });
  }

  resetBill(): void {
    this.items = [];
    this.currentBill = null;
    this.searchBarcode = '';
    this.searchMedicine = '';
    this.billForm.reset({
      customerName: '',
      customerPhone: '',
      payments: [
        { mode: PaymentMode.CASH, amount: 0, cashProvided: 0 }
      ]
    });
    this.paymentsFormArray.clear();
    this.addPayment();
  }

  addPayment(): void {
    const paymentForm = this.fb.group({
      mode: [PaymentMode.CASH, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      cashProvided: [0, [Validators.min(0)]]
    });
    this.paymentsFormArray.push(paymentForm);
    this.recalculatePaymentAmounts();
  }

  removePayment(index: number): void {
    if (this.paymentsFormArray.length > 1) {
      this.paymentsFormArray.removeAt(index);
      this.recalculatePaymentAmounts();
    }
  }

  onBarcodeScan(): void {
    if (!this.searchBarcode.trim()) {
      return;
    }

    this.processBarcode(this.searchBarcode.trim());
  }

  onMedicineSearch(): void {
    if (!this.searchMedicine.trim() || this.searchMedicine.trim().length < 2) {
      return;
    }

    if (this.medicineSearchResults.length > 0) {
      this.selectMedicineResult(this.medicineSearchResults[0]);
      return;
    }

    this.isLoading = true;
    this.inventoryService.searchMedicines(this.searchMedicine.trim()).subscribe({
      next: (medicines) => {
        if (medicines && medicines.length > 0) {
          // Add first result, or show selection dialog
          this.addItemByMedicine(medicines[0], 1);
          this.searchMedicine = '';
        } else {
          this.dialogService.warning('No se encontraron medicamentos');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        this.dialogService.error(error.message || 'Error al buscar medicamentos');
        this.isLoading = false;
      }
    });
  }

  onMedicineQueryChange(value: string): void {
    this.searchMedicine = value;
    this.medicineSearchTerms$.next(value);
  }

  selectMedicineResult(medicine: Medicine): void {
    this.addItemByMedicine(medicine, 1);
    this.searchMedicine = '';
    this.medicineSearchResults = [];
    this.isSearchingMedicines = false;
  }

  addItemByMedicine(medicine: Medicine, quantity: number, barcode?: string): void {
    // Check if medicine already in items
    const existingIndex = this.items.findIndex(item => item.medicineId === medicine.id);
    
    if (existingIndex >= 0) {
      // Update quantity
      this.items[existingIndex].quantity += quantity;
      if (barcode && !this.items[existingIndex].barcode) {
        this.items[existingIndex].barcode = barcode;
      }
      this.updateItemTotal(this.items[existingIndex]);
    } else {
      // Add new item
      const item: BillItem = {
        medicine,
        medicineId: medicine.id,
        barcode,
        quantity,
        unitPrice: 0, // Will be fetched from batch
        total: 0
      };
      this.items.push(item);
      
      // Fetch price from available batches
      this.fetchItemPrice(item);
    }
  }

  fetchItemPrice(item: BillItem): void {
    if (!item.medicineId) return;
    
    // Ensure medicine object is preserved - if missing, refetch it
    if (!item.medicine || !item.medicine.gstPercentage) {
      this.inventoryService.getMedicineById(item.medicineId).subscribe({
        next: (medicine) => {
          item.medicine = medicine;
          // Now fetch price
          this.fetchPriceFromBatches(item);
        },
        error: (error) => {
          console.error('Error fetching medicine:', error);
        }
      });
    } else {
      // Medicine object is present, just fetch price
      this.fetchPriceFromBatches(item);
    }
  }

  private fetchPriceFromBatches(item: BillItem): void {
    if (!item.medicineId) return;
    
    this.inventoryService.getBatchesByMedicine(item.medicineId).subscribe({
      next: (batches) => {
        // Get the first non-expired batch with available stock
        const availableBatch = batches.find(b => !b.expired && b.quantityAvailable > 0);
        if (availableBatch && availableBatch.sellingPrice) {
          item.unitPrice = availableBatch.sellingPrice;
          this.updateItemTotal(item);
        }
      },
      error: (error) => {
        // Silently fail - price will be calculated by backend
        console.error('Error fetching price:', error);
      }
    });
  }

  updateItemTotal(item: BillItem): void {
    if (item.unitPrice) {
      // Ensure medicine object is available with gstPercentage
      if (!item.medicine || !item.medicine.gstPercentage) {
        // Refetch medicine if missing
        if (item.medicineId) {
          this.inventoryService.getMedicineById(item.medicineId).subscribe({
            next: (medicine) => {
              item.medicine = medicine;
              this.calculateItemTotal(item);
              this.recalculatePaymentAmounts();
            },
            error: (error) => {
              console.error('Error fetching medicine for GST calculation:', error);
              // Calculate without GST if medicine fetch fails
              this.calculateItemTotal(item);
            }
          });
          return;
        }
      }
      this.calculateItemTotal(item);
    }
  }

  private calculateItemTotal(item: BillItem): void {
    if (!item.unitPrice) return;

    item.total = this.calculateRoundedItemTotal(item);
    this.recalculatePaymentAmounts();
  }

  private calculateRoundedItemTotal(item: BillItem): number {
    if (!item.unitPrice) {
      return 0;
    }

    const itemSubtotal = item.unitPrice * item.quantity;
    const gstPercentage = item.medicine?.gstPercentage || 0;
    const gstAmount = gstPercentage > 0 ? (itemSubtotal * gstPercentage) / 100 : 0;

    return this.roundUpToCashIncrement(itemSubtotal + gstAmount);
  }

  private roundUpToCashIncrement(amount: number): number {
    if (!amount || amount <= 0) {
      return 0;
    }

    return this.roundMoney(Math.ceil((amount - Number.EPSILON) * 10) / 10);
  }

  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 10) / 10;
  }

  private roundCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  updateQuantity(index: number, quantity: number): void {
    if (quantity > 0) {
      this.items[index].quantity = quantity;
      this.updateItemTotal(this.items[index]);
      // Force change detection for GST recalculation
      this.items = [...this.items];
      this.recalculatePaymentAmounts();
    }
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
    this.recalculatePaymentAmounts();
  }

  createBill(): void {
    if (this.items.length === 0) {
      this.dialogService.warning('Agrega al menos un producto a la venta');
      return;
    }

    // Validate that all items have required fields
    const invalidItems = this.items.filter(item => !item.medicineId && !item.barcode);
    if (invalidItems.length > 0) {
      this.dialogService.warning('Algunos productos no tienen informacion completa. Retiralos y agregalos nuevamente.');
      return;
    }

    this.isLoading = true;
    this.recalculatePaymentAmounts();

    // Map items to bill items (exclude internal fields)
    const billItems: BillItemRequest[] = this.items.map(item => {
      // Ensure at least one identifier is present
      if (!item.medicineId && !item.barcode) {
        throw new Error(`El producto ${item.medicine?.name || 'desconocido'} no tiene ID de medicamento ni código`);
      }
      return {
        medicineId: item.medicineId || undefined,
        barcode: item.medicineId ? undefined : item.barcode || undefined,
        quantity: item.quantity || 1 // Ensure quantity is at least 1
      };
    });

    // Validate items
    if (billItems.length === 0) {
      this.dialogService.warning('Agrega al menos un producto a la venta');
      this.isLoading = false;
      return;
    }

    // Map payments to payment requests (exclude cashProvided which is frontend-only)
    const payments: PaymentRequest[] = this.paymentsFormArray.value
      .filter((p: any) => {
        const amount = Number(p.amount);
        return !isNaN(amount) && amount > 0;
      })
      .map((p: any) => {
        const amount = Number(p.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`Monto de pago invalido: ${p.amount}`);
        }
        return {
          mode: p.mode,
          amount: amount,
          paymentReference: p.paymentReference || undefined
        };
      });

    // Validate payments
    if (payments.length === 0) {
      this.dialogService.warning('Agrega al menos un pago con monto mayor a 0');
      this.isLoading = false;
      return;
    }

    const request: CreateBillRequest = {
      items: billItems,
      customerName: this.billForm.get('customerName')?.value?.trim() || undefined,
      customerPhone: this.billForm.get('customerPhone')?.value?.trim() || undefined,
      payments: payments
    };

    // Debug: Log the request being sent
    console.log('Registrando venta con solicitud:', JSON.stringify(request, null, 2));

    this.billingService.createBill(request).subscribe({
      next: async (bill) => {
        this.currentBill = bill;
        const message = `Venta registrada correctamente: ${bill.billNumber}\n\nDeseas descargar el comprobante en PDF?`;
        const confirmed = await this.dialogService.confirm(message, 'Venta registrada');
        if (confirmed) {
          this.downloadBillPdf(bill.id);
        }
        this.resetBill();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error al registrar venta:', error);
        // Extract error message from response
        let errorMessage = 'Error al registrar venta';
        
        if (error.error) {
          // Check for validation field errors
          if (error.error.fieldErrors && Array.isArray(error.error.fieldErrors) && error.error.fieldErrors.length > 0) {
            const fieldErrors = error.error.fieldErrors
              .map((fe: any) => `${fe.field}: ${fe.message}`)
              .join('\n');
            errorMessage = `La validación falló:\n${fieldErrors}`;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.dialogService.error(errorMessage);
        this.isLoading = false;
      }
    });
  }

  downloadBillPdf(billId: number): void {
    this.isLoading = true;
    this.billingService.downloadBillPdf(billId).subscribe({
      next: (blob: Blob) => {
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Comprobante_${this.currentBill?.billNumber || billId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error al descargar PDF:', error);
        this.dialogService.error('Error al descargar PDF: ' + (error.message || 'error desconocido'));
        this.isLoading = false;
      }
    });
  }
}
