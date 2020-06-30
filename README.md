# Lima Server (Live Mapping)

```shell
ATTENTION: platform was created in under a week so expect bugs and generally poor coding :)
```

Server is written in NodeJS + MongoDB for user management. PostgreSQL PostGIS database and vector tiles server [Martin](https://github.com/urbica/martin/) are being used for storing/accessing drawn polygons.


## MongoDB Setup
Start mongo shell using the following command:

```shell
mongo
```

Within the shell, execute the line below to create a new datastore 'monitoring_db':
```shell
use monitoring_db;
```

Create a new user following the schema in db/index.js. The simplest way is to add this line to the mapping_live.js and it will create your first admin user:
```js
DB.mongooseUserDetails.register({username:'admin', editor: true}, 'password');
```

Modify MongoDB connection params in db/index.js according to your setup.


## PostgreSQL Setup
Add geometry and geography support to your pgsql database:
```sql
CREATE EXTENSION postgis;
```

Create a new table (this is a default schema) for user polygons:
```sql
CREATE TABLE public.platform (
	id serial NOT NULL,
	geom geometry NULL,
	"date" timestamp NULL,
	geoid varchar(50) NULL,
	area float4 NULL,
	comments text NULL,
	approved bool NULL DEFAULT false,
	owner varchar(50) NULL,
	CONSTRAINT platform_pkey PRIMARY KEY (id)
);
CREATE INDEX platform_geom_idx ON public.platform USING gist (geom);
ALTER TABLE public.platform OWNER TO web;
GRANT ALL ON TABLE public.platform TO martin;
```

Create a new table for the fishnet which admins can approve:
```sql
CREATE TABLE public.fishnet (
	gid int4 NOT NULL,
	geom geometry(MULTIPOLYGON, 4326) NULL,
	done bool NOT NULL DEFAULT false,
	id serial NOT NULL,
	CONSTRAINT fishnet_pkey PRIMARY KEY (id)
);
CREATE INDEX fishnet_geom_idx ON public.fishnet USING gist (geom);
ALTER TABLE public.fishnet OWNER TO web;
GRANT ALL ON TABLE public.fishnet TO martin;
```

Modify connection info in db/index.js according to your setup

## Martin Setup
Connect Martin (or another vector tiles server of your choice) to the PostgreSQL database.
Run a new Marting instance with a following configuration:
```yaml
# Database connection string
connection_string: 'postgres://username:password@localhost:5432/table_name'
# Maximum connections pool size [default: 20]
pool_size: 20
# Connection keep alive timeout [default: 75]
keep_alive: 75
# Number of web server workers
worker_processes: 8
# The socket address to bind [default: 0.0.0.0:3000]
listen_addresses: '0.0.0.0:3000'
# Enable watch mode
watch: true
# associative arrays of table sources
table_sources:
  public.platform:
    # table source id
    id: public.platform
    # table schema
    schema: public
    # table name
    table: platform
    # geometry column name
    geometry_column: geom
    # geometry srid
    srid: 4326
    # tile extent in tile coordinate space
    extent: 4096
    # buffer distance in tile coordinate space to optionally clip geometries
    buffer: 64
    # boolean to control if geometries should be clipped or encoded as is
    clip_geom: true
    # geometry type
    geometry_type: GEOMETRY
    # list of columns, that should be encoded as a tile properties
    properties:
      id: int4
      date: timestamp
      geoid: varchar
      area: float4
      comments: text
      approved: bool
      owner: varchar
```

If your table has a different name, you can change it in route/index.js

## Additional route changes
1) Change CORS origin url in mapping_live.js
2) clientRedirect param in routes/index.js