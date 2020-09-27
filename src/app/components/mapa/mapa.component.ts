import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { Subscription } from 'rxjs';
import { WebsocketService } from 'src/app/services/websocket.service';
import { environment } from 'src/environments/environment';
import { Lugar } from '../../interfaces/interfaces';

interface RespMarcadores {
   [key: string]: Lugar;
}

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit, OnDestroy {

  mapa: mapboxgl.Map;

  lugares: RespMarcadores = {};

  marketsMapBox: {[id: string]: mapboxgl.Marker} = {};

  suscripcionCargaMarcadores: Subscription;
  suscripcionCrear: Subscription;
  suscripcionMover: Subscription;
  suscripcionBorrar: Subscription;

  constructor(
    private http: HttpClient,
    private wsService: WebsocketService
  ) {

   }

  ngOnInit(): void {
    this.cargaInicialMarcadores();
    this.escucharSocket();
  }

  // carga inicial de marcadores
  public cargaInicialMarcadores(): void {
    this.suscripcionCargaMarcadores = this.http.get<RespMarcadores>(environment.urlSocket + '/mapa')
      .subscribe( (mapa: RespMarcadores) => {
        this.lugares = mapa;
        this.crearMapa();
        console.log(`lugares: ${JSON.stringify(this.lugares)}`);
        console.log(`mapa: ${JSON.stringify(mapa)}`);
      });
  }

  escucharSocket(): void {

    // escuchar socket creacion marcador
    this.suscripcionCrear = this.wsService.listen('marcador-crear')
      .subscribe ((marcador: Lugar) => {
        console.log(marcador);
        this.agregarMarcador(marcador);
      });


    // escuchar socket borrar marcador
    this.suscripcionBorrar = this.wsService.listen('marcador-borrar')
    .subscribe ((id: string) => {
      this.marketsMapBox[id].remove();
      delete this.marketsMapBox[id];

      delete this.lugares[id];

    });


    // escuchar socket movimiento de marcador
    this.suscripcionMover = this.wsService.listen('marcador-mover')
    .subscribe ((marcador: Lugar) => {
      const lngLat = {lng: marcador.lng, lat: marcador.lat};
      this.marketsMapBox[marcador.id].setLngLat(lngLat);
    });
  }

  crearMapa(): void {
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoiYW50b25pbzYzaiIsImEiOiJja2Y4Y2NhYzQwYXZvMndxZ3VhdDY5cjR0In0.OZk2du3Lc7snyVrkN5cU8A';
    this.mapa = new mapboxgl.Map({
      container: 'mapa',
      style: 'mapbox://styles/mapbox/streets-v11',
      // center: [-75.75512993582937 , 45.349977429009954],
      center: [-4.071384, 40.246399],
      zoom: 15.8
    });

    for (const [key, marcador] of Object.entries(this.lugares)) {
      this.agregarMarcador(marcador);
    }
  }

  agregarMarcador(marcador: Lugar): void {
    const h2 = document.createElement('h2');
    h2.innerHTML = marcador.nombre;
    const btnBorrar = document.createElement ('button');
    btnBorrar.innerHTML = 'Borrar';
    const nombre = document.createElement('caption');
    const div = document.createElement('div');
    div.append(h2, btnBorrar);

    const customPoppup = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: false
    }).setDOMContent(div);

    const marker = new mapboxgl.Marker({
      draggable: true,
      color: marcador.color
    })
      .setLngLat([marcador.lng, marcador.lat])
      .setPopup(customPoppup)
      .addTo(this.mapa);

    marker.on('drag', () => {
      const lngLat = marker.getLngLat();
      // TODO, enviar la nueva posición mediante sockets
      marcador.lat =  lngLat.lat;
      marcador.lng = lngLat.lng;

      this.wsService.emit('peticion-marcador-mover', marcador);
    });

    this.marketsMapBox[marcador.id] = marker;

    // Listener para de 'click' sobre el boton borrar
    btnBorrar.addEventListener('click', () => {
       marker.remove();
       delete this.marketsMapBox[marcador.id];

       // necesario para eliminar los marcadores guardados en lugares en la peticion de carga inicial (con api rest)
       delete this.lugares[marcador.id];

       console.log(`lugares cuando se notifica borrado de marcado: ${JSON.stringify(this.lugares)}`);

       this.wsService.emit('peticion-marcador-borrar', marcador.id);
    });
  }

  crearMarcador(): void {
    const nuevoMarcador: Lugar = {
      id: new Date().toISOString(),
      lat: 40.246669,
      lng: -4.071470,
      nombre: 'sin nombre',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };

    // el servidor difunde con emit.broadcast por tanto debemos agregar el marcador
    this.agregarMarcador(nuevoMarcador);

    // informa al back sobre la creación de un nuevo marcador
    this.wsService.emit('marcador-nuevo', nuevoMarcador);
  }

  ngOnDestroy(): void{
     this.suscripcionCrear.unsubscribe();
     this.suscripcionCargaMarcadores.unsubscribe();
  }

}
