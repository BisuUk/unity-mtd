using UnityEngine;
using System.Collections;

public class InGameDecalTest : MonoBehaviour {

    public DecalType i_decalType;
    public DecalType i_blood;
    public DecalType i_flow;
    public GameObject i_bloodSplatter;
    public GameObject i_dust;
    public bool i_fluid;

    private bool _allowFire = true;

    //Update is called once per frame
    private void Start()
    {
        //Combine all uncombined Decals
        DecalCreator.CreateCombinedStaticDecalInGame();
        //Profiler.enabled = true;
    }
    private void Update()
    {
        Fire();
    }
    ///Delay between shoot
    private IEnumerator Delay()
    {
        _allowFire = false;
        yield return new WaitForSeconds(0.16F);
        _allowFire = true;
    }
    ///Shoot
    private void Fire()
    {
        if (Input.GetMouseButton(0) && _allowFire)
        {
            //Audio shoot
            this.audio.PlayOneShot(this.audio.clip);

            RaycastHit hit;
            Ray ray = Camera.main.ViewportPointToRay(new Vector3(0.5F, 0.5F, 0));
            bool wasHit = Physics.Raycast(ray, out hit);
            if (wasHit)
            {  
                //Profiler.BeginSample("BURN DECAL ON TORUS");
                Material m = null;
                if (hit.collider.gameObject.renderer)
                {
                    //Get material instanse  
                    if(i_fluid)
                        m = Instantiate(i_flow.i_material) as Material;
                    else
                        m = Instantiate(i_decalType.i_material) as Material;

                    //Get bump from hited surface
                    if(hit.collider.gameObject.renderer.sharedMaterial.HasProperty("_BumpMap"))
                    {
                        Texture2D bumpMap = hit.collider.gameObject.renderer.sharedMaterial.GetTexture("_BumpMap") as Texture2D;
                        Vector2 bumpScale = hit.collider.gameObject.renderer.sharedMaterial.GetTextureScale("_BumpMap");
                        Vector2 bumpOffset = hit.collider.gameObject.renderer.sharedMaterial.GetTextureOffset("_BumpMap");
                        //Setup new bump
                        m.SetTexture("_SourceBumpMap", bumpMap);
                        m.SetTextureScale("_SourceBumpMap", bumpScale);
                        m.SetTextureOffset("_SourceBumpMap", bumpOffset);
                    }
                    else
                    {
                        m.SetTexture("_SourceBumpMap", null);
                    }

                    if(i_fluid)
                    {
                        //Flow decal
                        DecalCreator.CreateFluidDecal(i_flow, hit.point, ray.direction, hit.collider.gameObject, m);
                    }
                    else
                    {
                        //Burn decal
                        Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalType, hit.point, -hit.normal, hit.collider.gameObject);
                        //Create Decal Object
                        DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject, i_decalType, m); 
                    }                 
                }
                //Profiler.EndSample();

                //If we hit character
                if (hit.collider.transform.root.name == "Enemy")
                {
                    Blood(hit,ray.direction);
                    hit.collider.transform.root.SendMessage("ApplyDamage", SendMessageOptions.DontRequireReceiver);
                    SkinnedMeshRenderer smr = hit.collider.transform.root.GetComponentInChildren<SkinnedMeshRenderer>();
                    SkinDecal(hit, smr.gameObject);
                }
                else
                    Dust(hit);
            }

            StartCoroutine(Delay());
        }
    }
    ///Skin decal
    private void SkinDecal(RaycastHit hit, GameObject objWithSkin)
    {
        Mesh decalMesh=DecalCreator.CreateDecalMesh(i_blood, hit.point, -hit.normal, objWithSkin, Vector3.zero);
        DecalCreator.CreateDynamicSkinnedDecal(decalMesh, objWithSkin, i_blood, null);
    }
    ///Throw blood
    private void Blood(RaycastHit hit,Vector3 direction)
    {
        Instantiate(i_bloodSplatter, hit.point, Quaternion.LookRotation(hit.normal)); 
       
    }
    ///Throw dust
    private void Dust(RaycastHit hit)
    {
        Instantiate(i_dust, hit.point, Quaternion.LookRotation(hit.normal));
    }
}