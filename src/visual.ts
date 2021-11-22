module powerbi.extensibility.visual {
    "use strict";
    interface Plot {
        tooltips: string;
        latitude: number;
        longitude: number;
        color: string;
        radius: number;
    }

    interface WmsLayer {
        url: string;
        options: any;
    }

    // imported from 3rd party library
    const initialize = (<any>L).tooltipLayout.initialize;
    const resetMarker = (<any>L).tooltipLayout.resetMarker;
    const getMarkers = (<any>L).tooltipLayout.getMarkers;
    const getLine = (<any>L).tooltipLayout.getLine;

    (<any>L).DivIcon.CustomColor = L.DivIcon.extend({
        createIcon: function(oldIcon) {
               var icon = L.DivIcon.prototype.createIcon.call(this, oldIcon);
               icon.style.backgroundColor = this.options.color;
               return icon;
        }
    });

    (<any>L).divIconColor = function (options) {
        return new (<any>L).DivIcon.CustomColor(options);
    };
    
    export class Visual implements IVisual {
        private target: HTMLElement;
        private settings: VisualSettings;
        private mapContainer: HTMLElement;
        private map: L.Map;
        private plots: Plot[];
        private markerLayer: L.LayerGroup<any>;
        
        constructor(options: VisualConstructorOptions) {
            if (!document) { return; }
            this.target = options.element;
            this.createMapContainer();
            this.configureLeaflet();
        }

        private configureLeaflet() {
            function onPolylineCreated(ply) {
                ply.setStyle({
                    color: '#FF0000'
                })
            }
            
            // create L.Map off of the <div>
            this.map = new L.Map("mapid");
            this.map.setView(new L.LatLng(48.78, 9.18), 13);
            const layers = this.getTileLayers();
            layers.forEach(layer => this.map.addLayer(L.tileLayer.wms(layer.url, layer.options)));
            this.map.attributionControl.setPrefix(false);
            //initialize(this.map, onPolylineCreated);
        }
    
        private createMapContainer() {
            // add <div> to the DOM
            const div = document.createElement('div');
            div.id = 'mapid';
            div.style.width = `${this.target.clientWidth}px`;
            div.style.height = `${this.target.clientHeight}px`;
            this.mapContainer = div;
            this.target.appendChild(div);
        }
        
        private getTileLayers(): WmsLayer[] {
            let layers = tileConfiguration && 
                tileConfiguration.currentTargetEnvironment && 
                tileConfiguration.targetEnvironments[tileConfiguration.currentTargetEnvironment];
            return layers || [];
        }

        public destroy() {
            this.map.remove();
        }

        public update(options: VisualUpdateOptions) {
            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            this.resizeMap(options);
            this.plots = <Plot[]>this.parseData(options);
            this.drawMarkers();
        }

        private drawMarkers() {
            const { zoomToFit, defaultColor } = this.settings.leafletMap;

            if (this.markerLayer) this.map.removeLayer(this.markerLayer);

            const markers = this.plots.map(({tooltips, latitude, longitude, color, radius}) => {

                let iconColor = 'black';
                if (color) {
                    iconColor = color;
                } else if (defaultColor) {
                    iconColor = defaultColor;
                }
                const iconSize = radius || 20;

                const icon = (<any>L).divIconColor({
                    className: 'map-marker a-class',
                    iconSize: [iconSize, iconSize],
                    color: iconColor           
                });

                let marker = L.marker([latitude, longitude], {icon: icon});
                this.map.addLayer(marker);
                marker.bindTooltip(tooltips || '[Drag a field onto Tooltips]');
                //resetMarker(marker);
                return marker;
            });

            this.markerLayer = L.layerGroup(markers);
            this.map.addLayer(this.markerLayer);
    
            // zoom out so map shows all points
            if (zoomToFit) {
                var group = L.featureGroup(markers);
                this.map.fitBounds(group.getBounds());
            }
        }

        private parseData(options: VisualUpdateOptions) {
            /*
                Data passed into the visual is based on dataRoles and dataviewMappings
                https://github.com/woodbuffalo/powerbi-leaflet/blob/master/capabilities.json
                Parsing logic is found in the converter() method:
                https://github.com/woodbuffalo/powerbi-leaflet/blob/master/src/visual.ts
            */
            const { columns, rows } = options.dataViews[0].table;
            const data = rows.map(function (row, idx) {
                const item = row.reduce(function (d, v, i) {
                    const role = Object.keys(columns[i].roles)[0]
                    d[role] = v;
                    return d;
                }, {});
                return item;
            });
            return data;
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        private resizeMap(options: VisualUpdateOptions) {
            const { width, height } = options.viewport;
            this.mapContainer.style.width = width + 'px';
            this.mapContainer.style.height = height + 'px';
            this.map.invalidateSize(true);
        }
    
        /**
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
         * objects and properties you want to expose to the users in the property pane.
         *
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }
    }
}