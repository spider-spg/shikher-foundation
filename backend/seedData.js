const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Book = require('./models/Book');
const Handbag = require('./models/Handbag');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Book.deleteMany({});
    await Handbag.deleteMany({});
    
    console.log('Creating admin user...');
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      name: 'Administrator',
      email: 'admin@ngo.com',
      password: adminPassword,
      role: 'admin'
    });
    
    console.log('Creating customer user...');
    // Create sample customer
    const customerPassword = await bcrypt.hash('customer123', 12);
    const customer = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: customerPassword,
      role: 'customer'
    });
    
    console.log('Creating sample books...');
    // Create sample books
    const books = [
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780061120084',
        genre: 'Fiction',
        description: 'A classic novel about racial injustice and moral growth.',
        quantity: 5,
        totalQuantity: 5,
        image: '/uploads/books/default-book.jpg',
        language: 'English',
        publicationYear: 1960,
        condition: 'New',
        addedBy: admin._id
      },
      {
        title: '1984',
        author: 'George Orwell',
        isbn: '9780452284234',
        genre: 'Dystopian Fiction',
        description: 'A dystopian social science fiction novel about totalitarian control.',
        quantity: 3,
        totalQuantity: 3,
        image: '/uploads/books/default-book.jpg',
        language: 'English',
        publicationYear: 1949,
        condition: 'Good',
        addedBy: admin._id
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '9780141439518',
        genre: 'Romance',
        description: 'A romantic novel about manners, upbringing, morality, and marriage.',
        quantity: 4,
        totalQuantity: 4,
        image: '/uploads/books/default-book.jpg',
        language: 'English',
        publicationYear: 1813,
        condition: 'New',
        addedBy: admin._id
      },
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        genre: 'Fiction',
        description: 'A novel about the Jazz Age and the American Dream.',
        quantity: 6,
        totalQuantity: 6,
        image: '/uploads/books/default-book.jpg',
        language: 'English',
        publicationYear: 1925,
        condition: 'Good',
        addedBy: admin._id
      },
      {
        title: 'Harry Potter and the Sorcerer\'s Stone',
        author: 'J.K. Rowling',
        isbn: '9780439708180',
        genre: 'Fantasy',
        description: 'The first book in the Harry Potter series about a young wizard.',
        quantity: 8,
        totalQuantity: 8,
        image: '/uploads/books/default-book.jpg',
        language: 'English',
        publicationYear: 1997,
        condition: 'New',
        addedBy: admin._id
      }
    ];
    
    await Book.insertMany(books);
    
    console.log('Creating sample handbags...');
    // Create sample handbags
    const handbags = [
      {
        title: 'Classic Leather Tote',
        description: 'A beautiful handcrafted leather tote bag perfect for daily use.',
        price: 45.99,
        designerName: 'Artisan Crafts',
        category: 'Tote',
        material: 'Genuine Leather',
        quantity: 10,
        totalQuantity: 10,
        image: '/uploads/handbags/default-handbag.jpg',
        addedBy: admin._id
      },
      {
        title: 'Eco-Friendly Canvas Bag',
        description: 'Sustainable canvas bag made from recycled materials.',
        price: 25.99,
        designerName: 'Green Earth Co.',
        category: 'Shoulder',
        material: 'Recycled Canvas',
        quantity: 15,
        totalQuantity: 15,
        image: '/uploads/handbags/default-handbag.jpg',
        addedBy: admin._id
      },
      {
        title: 'Elegant Evening Clutch',
        description: 'Perfect clutch for special occasions and evening events.',
        price: 35.99,
        designerName: 'Luxe Designs',
        category: 'Evening',
        material: 'Satin with Beading',
        quantity: 8,
        totalQuantity: 8,
        image: '/uploads/handbags/default-handbag.jpg',
        addedBy: admin._id
      },
      {
        title: 'Casual Crossbody Bag',
        description: 'Comfortable crossbody bag for everyday adventures.',
        price: 29.99,
        designerName: 'Urban Style',
        category: 'Crossbody',
        material: 'Nylon',
        quantity: 12,
        totalQuantity: 12,
        image: '/uploads/handbags/default-handbag.jpg',
        addedBy: admin._id
      },
      {
        title: 'Vintage Style Backpack',
        description: 'Retro-inspired backpack with modern functionality.',
        price: 55.99,
        designerName: 'Retro Revival',
        category: 'Backpack',
        material: 'Canvas and Leather',
        quantity: 6,
        totalQuantity: 6,
        image: '/uploads/handbags/default-handbag.jpg',
        addedBy: admin._id
      }
    ];
    
    await Handbag.insertMany(handbags);
    
    console.log('Database seeded successfully!');
    console.log('Admin credentials:');
    console.log('Email: admin@ngo.com');
    console.log('Password: admin123');
    console.log('');
    console.log('Customer credentials:');
    console.log('Email: john@example.com');
    console.log('Password: customer123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();