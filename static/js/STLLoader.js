// STLLoader — рабочая реализация
THREE.STLLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.STLLoader.prototype = {

	constructor: THREE.STLLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setResponseType( 'arraybuffer' );
		loader.load( url, function ( buffer ) {

			console.log('STL loaded, size:', buffer.byteLength);
			
			try {
				var geometry = scope.parse( buffer );
				console.log('STL parsed, vertices:', geometry.attributes.position.count);
				if ( onLoad ) onLoad( geometry );
			} catch ( e ) {
				console.error('STL Parse Error:', e);
				if ( onError ) onError( e );
			}

		}, onProgress, onError );

	},

	setPath: function ( value ) {

		this.path = value;
		return this;

	},

	parse: function ( buffer ) {

		if ( !buffer || buffer.byteLength === 0 ) {
			throw new Error('Empty buffer');
		}

		console.log('Parsing STL, buffer size:', buffer.byteLength);

		// Сначала попробуем найти 'facet normal' в буфере — это признак ASCII STL
		var textCandidate = new TextDecoder( 'utf-8', { fatal: false } ).decode( buffer );
		var hasFacetNormal = textCandidate.indexOf( 'facet normal' ) !== -1;
		var hasVertex = textCandidate.indexOf( 'vertex' ) !== -1;

		if ( hasFacetNormal && hasVertex ) {
			console.log('Detected ASCII STL format');
			return this.parseASCII( textCandidate );
		}

		// Иначе — бинарный STL
		console.log('Detected Binary STL format');
		return this.parseBinary( buffer );

	},

	parseBinary: function ( buffer ) {

		var view = new DataView( buffer );
		var bufferLength = buffer.byteLength;

		console.log('Binary STL, buffer length:', bufferLength);

		if ( bufferLength < 84 ) {
			throw new Error('Binary STL too small: ' + bufferLength);
		}

		// Читаем количество треугольников (little-endian)
		var numTriangles = view.getUint32( 80, true );
		console.log('Number of triangles from header:', numTriangles);

		// Проверяем что данных достаточно
		var expectedSize = 84 + numTriangles * 50;
		if ( bufferLength !== expectedSize && bufferLength < expectedSize ) {
			console.warn('File truncated, using available data');
			numTriangles = Math.floor((bufferLength - 84) / 50);
			console.log('Adjusted triangles:', numTriangles);
		} else if ( bufferLength > expectedSize ) {
			console.warn('File larger than expected, using header count');
		}

		// Если треугольников 0 или отрицательное число — пробуем определить автоматически
		if ( numTriangles <= 0 || numTriangles > 1000000 ) {
			console.warn('Invalid triangle count, calculating from file size');
			numTriangles = Math.floor((bufferLength - 84) / 50);
			console.log('Calculated triangles:', numTriangles);
		}

		var vertices = [];
		var normals = [];
		var faces = [];
		var offset = 84;

		for ( var i = 0; i < numTriangles; i ++ ) {

			if ( offset + 50 > bufferLength ) break;

			// Нормаль (начинается с offset + 0)
			var nx = view.getFloat32( offset + 0, true );
			var ny = view.getFloat32( offset + 4, true );
			var nz = view.getFloat32( offset + 8, true );

			// Проверка на NaN/Infinity
			if (!isFinite(nx) || !isFinite(ny) || !isFinite(nz)) {
				nx = 0; ny = 1; nz = 0;
			}

			for ( var j = 0; j < 3; j ++ ) {

				var vertexOffset = offset + 12 + j * 12;
				var x = view.getFloat32( vertexOffset, true );
				var y = view.getFloat32( vertexOffset + 4, true );
				var z = view.getFloat32( vertexOffset + 8, true );

				// Проверка на NaN/Infinity
				if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
					x = 0; y = 0; z = 0;
				}

				vertices.push( x, y, z );
				normals.push( nx, ny, nz );

			}

			faces.push( i * 3, i * 3 + 1, i * 3 + 2 );
			offset += 50;

		}

		console.log('Parsed:', vertices.length / 3, 'vertices,', faces.length, 'faces');

		var geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
		geometry.setIndex( faces );

		return geometry;

	},

	parseASCII: function ( data ) {

		var vertices = [];
		var normals = [];
		var faces = [];
		var lines = data.split( '\n' );

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ].trim();

			if ( line === '' ) continue;

			if ( line.indexOf( 'facet normal' ) !== -1 ) {

				var parts = line.split( /\s+/ );
				if ( parts.length >= 5 ) {
					normals.push( parseFloat( parts[ 2 ] ), parseFloat( parts[ 3 ] ), parseFloat( parts[ 4 ] ) );
				} else {
					normals.push( 0, 1, 0 );
				}

			} else if ( line.indexOf( 'vertex' ) !== -1 ) {

				var parts = line.split( /\s+/ );
				if ( parts.length >= 4 ) {
					vertices.push( parseFloat( parts[ 1 ] ), parseFloat( parts[ 2 ] ), parseFloat( parts[ 3 ] ) );
				}

			}

			if ( vertices.length >= 9 ) {

				var v1 = vertices.length - 9;
				var v2 = vertices.length - 6;
				var v3 = vertices.length - 3;

				faces.push( v1, v2, v3 );
				vertices.length = v1;
				normals.length = normals.length - 3;

			}

		}

		console.log('ASCII STL:', vertices.length / 3, 'vertices,', faces.length, 'faces');

		var geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
		geometry.setIndex( faces );

		return geometry;

	}

};
