const { prisma } = require('../services/db');

const getAllGroups = async (req, res) => {
  try {
    const groups = await prisma.taskGroup.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(groups);
  } catch (error) {
    console.error('Failed to get groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const existing = await prisma.taskGroup.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Group already exists' });

    const group = await prisma.taskGroup.create({
      data: { name }
    });
    res.status(201).json(group);
  } catch (error) {
    console.error('Failed to create group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const group = await prisma.taskGroup.update({
      where: { id },
      data: { name }
    });
    res.json(group);
  } catch (error) {
    console.error('Failed to update group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.taskGroup.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

module.exports = {
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroup
};
