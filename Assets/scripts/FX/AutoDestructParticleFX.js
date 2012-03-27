#pragma strict

var particle : ParticleSystem;

function LateUpdate ()
{
   if (!particle.IsAlive())
      Destroy (gameObject);
}