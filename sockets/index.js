class socketLogic {
	constructor(io) {
		this.io = io;
		this.users = [];
		this.initSocketLogic();
	}

	initSocketLogic() {
		this.io.on('connection', (socket) => {
			// mouse movement
			socket.on('user_mouse_update', (project, user, user_addition, lat, lng) => {
				this.io.emit('user_mouse_update', project, user, user_addition, lat, lng);
			});
			

			// geometry checks
			socket.on('user_created_geometry', (project, user, geojson) => {
				this.io.emit('user_created_geometry', project, user, geojson);
			});
			socket.on('user_removed_geometry', (project, user, geoid) => {
				this.io.emit('user_removed_geometry', project, user, geoid);
			});
			socket.on('user_modified_geometry', (project, user, geoid) => {
				this.io.emit('user_modified_geometry', project, user, geoid);
			});


			// approval changes
			// drawn items
			socket.on('admin_changed_approval', (project, user, geoid, approved) => {
				this.io.emit('admin_changed_approval', project, user, geoid, approved);
			});
			// fishnet cell
			socket.on('admin_changed_fishnet', (project, user, gid, status) => {
				this.io.emit('admin_changed_fishnet', project, user, gid, status);
			});
		});
	}
}

module.exports = socketLogic;