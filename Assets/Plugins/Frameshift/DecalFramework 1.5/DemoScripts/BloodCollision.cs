using UnityEngine;
using System.Collections;

public class BloodCollision : MonoBehaviour {

    public DecalType i_decalType;

    private bool _existFirstCollide = false;

    private IEnumerator Start()
    {
        for(int i =0;i<60;++i)
        {
            this.GetComponent<ParticleAnimator>().force += new Vector3(0,(float)-i/4,0);
            yield return null;
        }
    }
    private void OnParticleCollision(GameObject other)
    {
        if (_existFirstCollide)
            return;
        _existFirstCollide = true;

        //Get material instanse 
        Material m = Instantiate(i_decalType.i_material) as Material;
        
        if(!other.renderer)
            return;

        //Получаем данные о бампе поверхности по которой выстрелили
        Texture2D bumpMap = other.renderer.sharedMaterial.GetTexture("_BumpMap") as Texture2D;
        Vector2 bumpScale = other.renderer.sharedMaterial.GetTextureScale("_BumpMap");
        Vector2 bumpOffset = other.renderer.sharedMaterial.GetTextureOffset("_BumpMap");
        //Настраиваем новый бамп
        m.SetTexture("_SourceBumpMap", bumpMap);
        m.SetTextureScale("_SourceBumpMap", bumpScale);
        m.SetTextureOffset("_SourceBumpMap", bumpOffset);

        Vector3 summVelocity = Vector3.zero;
        foreach(Particle p in this.particleEmitter.particles)
        {
            summVelocity += p.velocity;
        }

        Collider[] colliders=Physics.OverlapSphere(this.particleEmitter.particles[0].position, 0.3F);

        Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType, this.particleEmitter.particles[0].position,summVelocity.normalized, colliders);
        DecalCreator.CreateDynamicDecal(decalMesh, other, i_decalType, m);

        Destroy(this.gameObject); 
    }  
}
