import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Backend desplegado en Render
  private apiUrl = 'https://medizano.onrender.com/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http
      .get<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http
      .post<T>(`${this.apiUrl}${endpoint}`, body, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http
      .put<T>(`${this.apiUrl}${endpoint}`, body, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  getBlob(endpoint: string): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}${endpoint}`, {
        headers: this.getHeaders(),
        responseType: 'blob'
      })
      .pipe(catchError(error => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'No se pudo conectar con el servidor.';
          break;
        case 401:
          errorMessage = 'Usuario o contraseña incorrectos.';
          break;
        case 403:
          errorMessage = 'No tienes permiso para realizar esta acción.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor.';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
