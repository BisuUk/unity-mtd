using System;
using System.Collections.Generic;
using System.Text;

namespace LibNoise.Modifiers
{
    /// <summary>
    /// Module that returns the output of two source modules added together.
    /// </summary>
    public class Add
        : IModule
    {
        /// <summary>
        /// The first module from which to retrieve noise.
        /// </summary>
        public IModule SourceModule1 { get; set; }
        /// <summary>
        /// The second module from which to retrieve noise.
        /// </summary>
        public IModule SourceModule2 { get; set; }

        /// <summary>
        /// Initialises a new instance of the Add class.
        /// </summary>
        /// <param name="sourceModule1">The first module from which to retrieve noise.</param>
        /// <param name="sourceModule2">The second module from which to retrieve noise.</param>
        public Add(IModule sourceModule1, IModule sourceModule2)
        {
            if (sourceModule1 == null || sourceModule2 == null)
                throw new ArgumentNullException("Source modules must be provided.");

            SourceModule1 = sourceModule1;
            SourceModule2 = sourceModule2;
        }

        /// <summary>
        /// Returns the output of the two source modules added together.
        /// </summary>
        public double GetValue(double x, double y, double z)
        {
            if (SourceModule1 == null || SourceModule2 == null)
                throw new NullReferenceException("Source modules must be provided.");

            return SourceModule1.GetValue(x, y, z) + SourceModule2.GetValue(x, y, z);
        }
    }
}
