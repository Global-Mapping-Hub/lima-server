class socketLogic {
	constructor(io) {
		this.io = io;
		this.users = [];
		this.initSocketLogic();
	}

	initSocketLogic() {
		// namespace for users' mice positions
		this.io.of('/micemove').on('connection', (socket) => {
			socket.on('user_mouse_update', (user, user_addition, lat, lng) => {
				this.io.of('/micemove').emit('user_mouse_update', user, user_addition, lat, lng);
			});
		});

		// for other stuff
		this.io.on('connection', (socket) => {
			// geometry checks
			socket.on('user_created_geometry', (user, geojson) => {
				this.io.emit('user_created_geometry', user, geojson);
			});
			socket.on('user_removed_geometry', (user, geoid) => {
				this.io.emit('user_removed_geometry', user, geoid);
			});
			socket.on('user_modified_geometry', (user, geoid) => {
				this.io.emit('user_modified_geometry', user, geoid);
			});

			// approval changes
			// drawn items
			socket.on('admin_changed_approval', (user, geoid, approved) => {
				this.io.emit('admin_changed_approval', user, geoid, approved);
			});
			// fishnet cell
			socket.on('admin_changed_fishnet', (user, gid, status) => {
				this.io.emit('admin_changed_fishnet', user, gid, status);
			});
		});
	}
}

module.exports = socketLogic;