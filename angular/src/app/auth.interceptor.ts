import{ HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import{ inject } from "@angular/core";
import{ Router } from "@angular/router";
import{ catchError, throwError } from "rxjs";
import{ Auth } from "./auth";

export const authInterceptor: HttpInterceptorFn = (req, next) =>{
  const auth = inject(Auth);
  const router = inject(Router);
  const token = auth.token();

  const peticion = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((err: HttpErrorResponse) =>{
      if (err.status === 401 && token){
        auth.cerrarSesion();
        router.navigate(["/acceso"]);
      }
      return throwError(() => err);
    })
  );
};
