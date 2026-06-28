import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBook, 
  FaHandPaper, 
  FaDonate, 
  FaUsers, 
  FaHeart,
  FaStar,
  FaArrowRight,
  FaShieldAlt,
  FaGlobe,
  FaHandsHelping,
  FaShoppingBag
} from 'react-icons/fa';

const Home = () => {
  const features = [
    {
      icon: FaBook,
      title: 'Book Borrows',
      description: '  Borrow books for reading and education',
      link: '/books',
      color: 'text-green-600'
    },
    {
      icon: FaShoppingBag,
      title: 'Selling Handbags',
      description: 'Selling handcrafted handbags',
      link: '/handbags',
      color: 'text-orange-600'
    },
    {
      icon: FaHeart,
      title: 'Donations',
      description: 'Books and essential items donations',
      link: '/donate',
      color: 'text-blue-600'
    }
  ];


  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 via-orange-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-green-0">We change the world</span>
                <span className="text-blue-300"> a little each day</span>
                <span className="text-green-300"> with our efforts</span>
              </h1>
              <p className="text-xl text-gray-100 leading-relaxed">
                Supporting communities through environmental consciousness, waste reduction, 
                recycling initiatives, and women empowerment while creating sustainable solutions for a greener world.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link 
                  to="/handbags" 
                  className="btn-white inline-flex items-center justify-center space-x-2"
                >
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-green-700 transition-colors duration-200"
                >
                  Know More
                </Link>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="relative">
                <div className="bg-white bg-opacity-10 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="bg-yellow-400 p-3 rounded-full">
                        <FaBook className="text-green-600 text-xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Book Borrows</h3>
                        <p className="text-gray-200 text-sm"> Borrow books for reading</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="bg-yellow-400 p-3 rounded-full">
                        <FaShoppingBag className="text-orange-600 text-xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Selling Handbag</h3>
                        <p className="text-gray-200 text-sm">Handcrafted bags supporting our initiatives</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="bg-yellow-400 p-3 rounded-full">
                        <FaHeart className="text-blue-600 text-xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Donations</h3>
                        <p className="text-gray-200 text-sm">Books and Essential items for children & families</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Key Activities
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Shikher Foundations focuses on waste management, recycling initiatives, environmental protection and women empowerment
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 text-center hover:shadow-lg transition-shadow group">
                <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.color} bg-opacity-10 rounded-full mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`text-2xl ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <Link 
                  to={feature.link}
                  className="inline-flex items-center space-x-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                >

                  <FaArrowRight className="text-sm" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

    

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Join Our Mission Today
          </h2>
          <p className="text-xl text-gray-100 mb-8">
          Help us create a pollution-free India by donating unused items and supporting our recycling initiatives for environmental protection and women empowerment.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
            <Link to="/signup" className="btn-white">
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;