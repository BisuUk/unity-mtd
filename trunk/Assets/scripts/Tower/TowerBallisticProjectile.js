#pragma strict

var timeToImpact : float;
var arcHeight : float;
var targetPos : Vector3;
var projectile : GameObject;
var explosionPrefab : Transform;
var color : Color;


function Fire()
{
   iTween.MoveTo(gameObject, {"position":targetPos,"time":timeToImpact,"easetype":"linear"});
   iTween.MoveBy(projectile, {"amount":Vector3(0,arcHeight,0),"time":timeToImpact/2.0,"easetype":"easeOutQuad","oncompletetarget":gameObject,"oncomplete":"AtArc"});
}

function AtArc()
{
   iTween.MoveBy(projectile, {"amount":Vector3(0,-arcHeight,0),"time":timeToImpact/2.0,"easetype":"easeInQuad","oncompletetarget":gameObject,"oncomplete":"AtEnd"});
}

function AtEnd()
{
   var explosion : Transform = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
   var explosionParticle = explosion.GetComponent(ParticleSystem);
   explosionParticle.startColor = color;
   Destroy(gameObject);
}

function SetColor(newColor : Color)
{
   color = newColor;
   projectile.GetComponent(TrailRenderer).renderer.material.color = newColor;
   projectile.renderer.material.color = newColor;
   projectile.renderer.material.SetColor("_TintColor", newColor);
}