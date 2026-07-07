const { prisma } = require('../services/db');

/**
 * Get all teams
 */
const getTeams = async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });
    res.json(teams);
  } catch (error) {
    console.error('Fetch teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
};

/**
 * Create a new team
 */
const createTeam = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Admin or Manager role required.' });
  }

  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Team name is required.' });
  }

  try {
    const existingTeam = await prisma.team.findUnique({
      where: { name: name.trim() },
    });
    if (existingTeam) {
      return res.status(400).json({ error: 'A team with this name already exists.' });
    }

    const team = await prisma.team.create({
      data: { name: name.trim() },
      include: { users: { select: { id: true, name: true, email: true, role: true } } }
    });
    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team.' });
  }
};

/**
 * Update a team
 */
const updateTeam = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Admin or Manager role required.' });
  }

  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Team name is required.' });
  }

  try {
    // Check name collision
    const existingTeam = await prisma.team.findFirst({
      where: { name: name.trim(), id: { not: id } },
    });
    if (existingTeam) {
      return res.status(400).json({ error: 'Another team with this name already exists.' });
    }

    const team = await prisma.team.update({
      where: { id },
      data: { name: name.trim() },
      include: { users: { select: { id: true, name: true, email: true, role: true } } }
    });
    res.json(team);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team.' });
  }
};

/**
 * Delete a team
 */
const deleteTeam = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Admin or Manager role required.' });
  }

  const { id } = req.params;

  try {
    await prisma.team.delete({
      where: { id },
    });
    res.json({ message: 'Team deleted successfully.' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team.' });
  }
};

module.exports = {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
};
