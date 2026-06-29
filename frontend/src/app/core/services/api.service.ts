import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    // Dynamically determine API URL based on current hostname to support network access
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    // If accessing via localhost or 127.0.0.1, use localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.apiUrl = 'http://localhost:8080/api';
    } else {
      // Otherwise, use the current hostname for devices on the same local network.
      this.apiUrl = `http://${hostname}:8080/api`;
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, body, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${endpoint}`, body, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getBlob(endpoint: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}${endpoint}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(catchError((error) => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error?.message) {
        errorMessage = this.translateKnownMessage(error.error.message);
      } else if (error.error?.error) {
        errorMessage = error.error.error;
        // If there are field errors, append them
        if (error.error.fieldErrors && Array.isArray(error.error.fieldErrors)) {
          const fieldErrors = error.error.fieldErrors
            .map((fe: any) => `${fe.field}: ${fe.message}`)
            .join('\n');
          errorMessage += '\n' + fieldErrors;
        }
      } else {
        switch (error.status) {
          case 0:
            errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.';
            break;
          case 401:
            errorMessage = 'Tu sesión venció o no es válida. Inicia sesión nuevamente.';
            break;
          case 403:
            errorMessage = 'No tienes permiso para realizar esta acción.';
            break;
          case 404:
            errorMessage = 'No se encontró la información solicitada.';
            break;
          case 500:
            errorMessage = 'El servidor tuvo un problema. Intenta nuevamente.';
            break;
          default:
            errorMessage = `No se pudo completar la solicitud. Código: ${error.status}`;
        }
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  private translateKnownMessage(message: string): string {
    const normalized = message.toLowerCase();

    if (normalized.includes('invalid username or password') || normalized.includes('bad credentials')) {
      return 'Usuario o contraseña incorrectos. Revisa tus datos e intenta nuevamente.';
    }

    if (normalized.includes('access denied') || normalized.includes('permission')) {
      return 'No tienes permiso para realizar esta acción.';
    }

    if (normalized.includes('authentication failed')) {
      return 'No se pudo autenticar. Revisa tus credenciales.';
    }

    return message;
  }
}
