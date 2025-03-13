const Note = require('../models/Note');
const User = require('../models/User');

// @desc    Get all notes
// @route   GET /notes
// @access  Private
const getAllNotes = async (req, res) => {
	// Get all notes from the database
	const notes = await Note.find().lean();

	// If no notes found, return an error
	if (!notes?.length) {
		return res.status(400).json({ message: 'No notes found' });
	}

	const notesWithUser = await Promise.all(
		notes.map(async (note) => {
			const user = await User.findById(note.user).lean().exec();
			return { ...note, user: user.username };
		})
	);

	res.json(notesWithUser);
};

// @desc    Create new note
// @route   POST /notes
// @access  Private
const createNewNote = async (req, res) => {
	const { user, title, text } = req.body;

	// Confirm data
	if (!user || !title || !text) {
		res.status(400);
		throw new Error('All fields are required');
	}

	// Check for duplicate title
	const duplicate = await Note.findOne({ title })
		.collation({ locale: 'en', strength: 2 })
		.lean()
		.exec();

	if (duplicate) {
		res.status(409);
		throw new Error('Duplicate note title');
	}

	// Create and store the new note
	const note = await Note.create({ user, title, text });

	if (note) {
		res.status(201).json({ message: 'New note created' });
	} else {
		res.status(400);
		throw new Error('Invalid note data received');
	}
};

// @desc    Update note
// @route   PATCH /notes
// @access  Private
const updateNote = async (req, res) => {
	const { id, user, title, text, completed } = req.body;

	// Confirm data
	if (!id || !user || !title || !text || typeof completed !== 'boolean') {
		res.status(400);
		throw new Error('All fields are required');
	}

	// Confirm note exists
	const note = await Note.findById(req.body.id);

	if (!note) {
		res.status(404);
		throw new Error('Note not found');
	}

	// Check for duplicate title
	const duplicate = await Note.findOne({ title })
		.collation({ locale: 'en', strength: 2 })
		.lean()
		.exec();

	if (duplicate && duplicate._id.toString() !== id) {
		res.status(409);
		throw new Error('Duplicate note title');
	}

	note.user = user;
	note.title = title;
	note.text = text;
	note.completed = completed;

	const updatedNote = await note.save();

	res.json(`'${updatedNote.title}' updated`);
};

// @desc    Delete note
// @route   DELETE /notes
// @access  Private
const deleteNote = async (req, res) => {
	const { id } = req.body;

	// Confirm data
	if (!id) {
		return res.status(400).json({ message: 'Note ID required' });
	}

	// Confirm note exists to delete
	const note = await Note.findById(id).exec();

	if (!note) {
		return res.status(400).json({ message: 'Note not found' });
	}

	const result = await note.deleteOne();

	const reply = `Note '${note.title}' with ID ${note._id} deleted`;

	res.json(reply);
};

module.exports = {
	getAllNotes,
	createNewNote,
	updateNote,
	deleteNote,
};
