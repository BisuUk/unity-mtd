#pragma strict

var audioSources : AudioSource[];
var particleEmitters : AudioSource[];

function PlayAudioSource(index : int)
{
   if (index < audioSources.Length)
      audioSources[index].Play();
}

function PlayParticleEmitter(index : int)
{
   if (index < particleEmitters.Length)
      particleEmitters[index].Play();
}
