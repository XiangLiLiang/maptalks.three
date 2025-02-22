import * as maptalks from 'maptalks';
import * as THREE from 'three';
import BaseObject from './BaseObject';

/**
 * 
 * @param {maptalks.Polygon} polygon 
 * @param {*} layer 
 */
function toShape(polygon, layer) {
    let shell, holes;
    //it is pre for geojson,Possible later use of geojson
    if (Array.isArray(polygon)) {
        shell = polygon[0];
        holes = polygon.slice(1, polygon.length);
    } else {
        shell = polygon.getShell();
        holes = polygon.getHoles();
    }
    const outer = shell.map(c => layer.coordinateToVector3(c));
    const shape = new THREE.Shape(outer);
    if (holes && holes.length > 0) {
        shape.holes = holes.map(item => {
            const pts = item.map(c => layer.coordinateToVector3(c));
            return new THREE.Shape(pts);
        });
    }
    return shape;
}

/**
 * 
 * @param {maptalks.Polygon|maptalks.MultiPolygon} polygon 
 * @param {*} height 
 * @param {*} layer 
 */
function getExtrudeGeometry(polygon, height, layer) {
    if (!polygon) {
        return null;
    }
    let shape;
    if (polygon instanceof maptalks.MultiPolygon) {
        shape = polygon.getGeometries().map(p => {
            return toShape(p, layer);
        });
    } else if (polygon instanceof maptalks.Polygon) {
        shape = toShape(polygon, layer);
    }
    //Possible later use of geojson
    if (!shape) return null;
    height = layer.distanceToVector3(height, height).x;
    const name = parseInt(THREE.REVISION) >= 93 ? 'depth' : 'amount';
    const config = {
        'bevelEnabled': false, 'bevelSize': 1
    };
    config[name] = height;
    const geom = new THREE.ExtrudeGeometry(shape, config);
    const buffGeom = new THREE.BufferGeometry();
    buffGeom.fromGeometry(geom);
    return buffGeom;
}

/**
 * 
 * @param {*} geometry 
 * @param {*} color 
 * @param {*} _topColor 
 */
function initVertexColors(geometry, color, _topColor) {
    const position = geometry.attributes.position.array;
    const len = position.length;
    const bottomColor = (color instanceof THREE.Color ? color : new THREE.Color(color));
    const topColor = new THREE.Color(_topColor);
    const colors = [];
    for (let i = 0; i < len; i += 3) {
        const z = position[i + 2];
        if (z > 0) {
            colors.push(topColor.r, topColor.r, topColor.b);
        } else {
            colors.push(bottomColor.r, bottomColor.r, bottomColor.b);
        }
    }
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3, true));
    return colors;
}



const OPTIONS = {
    altitude: 0,
    height: 1,
    topColor: null,
    bottomColor: '#2d2f61',
}

/**
 * 
 */
class ExtrudePolygon extends BaseObject {
    constructor(polygon, options, material, layer) {
        options = maptalks.Util.extend({}, OPTIONS, options, { layer, polygon });
        super();
        this._initOptions(options);
        const { height, topColor, bottomColor, altitude } = options;
        const geometry = getExtrudeGeometry(polygon, height, layer);
        if (topColor && !material.map) {
            initVertexColors(geometry, bottomColor, topColor);
            material.vertexColors = THREE.VertexColors;
        }
        this._createMesh(geometry, material);
        const z = layer.distanceToVector3(altitude, altitude).x;
        this.getObject3d().position.z = z;
    }
}

export default ExtrudePolygon;
