import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  public socketStatus = false;
  public usuario = null;

  constructor(
    private socket: Socket
  ) {
    this.checkStatus();
  }


    checkStatus(): void {

      this.socket.on('connect', () => {
        console.log('Conectado al servidor');
        this.socketStatus = true;
        // TODO, hacer carga marcadores
      });

      this.socket.on('disconnect', () => {
        console.log('Desconectado del servidor');
        this.socketStatus = false;
      });
    }


    emit( evento: string, payload?: any, callback?: Function ) {

      console.log('Emitiendo', evento);
      // emit('EVENTO', payload, callback?)
      this.socket.emit( evento, payload, callback );

    }

    listen( evento: string ): Observable<unknown> {
      return this.socket.fromEvent( evento );
    }



}
