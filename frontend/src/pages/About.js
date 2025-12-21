import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBook, 
  FaHandPaper, 
  FaHeart,
  FaUsers,
  FaDonate,
  FaGlobe,
  FaHandsHelping,
  FaChild,
  FaGraduationCap
} from 'react-icons/fa';

const About = () => {
  const activities = [
    {
      icon: FaBook,
      title: 'Book Distribution',
      description: 'We distribute educational books to children in underserved communities, ensuring access to quality learning materials that can transform their educational journey.'
    },
    {
      icon: FaHandPaper,
      title: 'Toy Donations',
      description: 'Providing children with educational toys and learning materials that support cognitive development and bring joy to their daily lives.'
    },
    {
      icon: FaDonate,
      title: 'Item Collection',
      description: 'Collecting essential items like clothes, school supplies, and everyday necessities for children and families who need them most.'
    },
    {
      icon: FaChild,
      title: 'Child Support',
      description: 'Comprehensive support programs focused on child welfare, education, and development in partnership with local communities.'
    }
  ];

  const values = [
    {
      icon: FaHeart,
      title: 'Child-Centered Mission',
      description: 'Every initiative we undertake is designed with children\'s welfare and development at its core.'
    },
    {
      icon: FaHandsHelping,
      title: 'Community Partnership',
      description: 'We work closely with local communities to understand their needs and provide meaningful, lasting support.'
    },
    {
      icon: FaGlobe,
      title: 'Sustainable Impact',
      description: 'Our programs are designed to create long-term positive change that extends beyond immediate assistance.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 via-orange-600 to-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              About <span className="text-yellow-300">Shikher Foundation</span>
            </h1>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto leading-relaxed mb-8">
              We change the world a little each day with our efforts
            </p>
            <div className="bg-white bg-opacity-10 rounded-xl p-6 max-w-4xl mx-auto backdrop-blur-sm">
              <p className="text-lg text-gray-100">
                Shikher Foundation is dedicated to improving the lives of children and families through education, 
                and essential support services. We believe that small, consistent efforts can create 
                meaningful change in our communities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Our Mission
            </h2>
            <p className="text-lg bg-gradient-to-r from-green-600 via-orange-600 to-blue-600 bg-clip-text text-transparent leading-relaxed mb-6 max-w-4xl mx-auto">
              Shikher Foundation works tirelessly to bridge the gap between privilege and need. 
              Our mission is simple yet powerful: to ensure that every child has access to 
              educational resources, learning materials, and the support they need to thrive.
            </p>
            <p className="text-lg bg-gradient-to-r from-green-600 via-orange-600 to-blue-600 bg-clip-text text-transparent leading-relaxed mb-8 max-w-4xl mx-auto">
              Through book distribution, toys and essential item donations, we create 
              pathways for learning and development that can transform young lives. We believe 
              that education and play are fundamental rights, not privileges.
            </p>
          </div>
        </div>
      </section>

      

      {/* Contact Information */}
      <section className="py-20 bg-gradient-to-br from-green-600 via-orange-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Get Involved
          </h2>
          <p className="text-xl text-gray-100 mb-8">
            A small contribution from you can change the world for a child.
          </p>
          
          
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
            <Link to="/donate" className="btn-white">
              Start Donating
            </Link>
            <Link to="/books" className="btn-outline-white">
              Explore Books
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;